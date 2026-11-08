/**
 * =========================================================================================
 * PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
 * ENTREGABLE: FASE 1B - Firmware ESP32-DevKitC V4 (Gateway IoT Wi-Fi / MQTT)
 * UNIVERSIDAD: Universidad Nacional de Trujillo
 * =========================================================================================
 * 
 * DESCRIPCIÓN:
 * Este firmware se ejecuta en el módulo ESP32-DevKitC V4 (lógica 3.3V). Actúa como puente
 * bidireccional entre el bus UART del microcontrolador Edge (Arduino Nano) y la red IP/MQTT:
 * 
 * 1. Conexión de red:
 *    - Wi-Fi en modo Station (WPA2).
 *    - Sincronización horaria vía NTP (Network Time Protocol) para generar `timestamp_origen`
 *      exacto en época Unix (segundos y milisegundos).
 * 2. Conexión MQTT (PubSubClient):
 *    - Conexión autenticada al Broker EMQX (puerto 1883).
 *    - Suscripción al tópico de órdenes de control: `lab/piloto/accion`.
 * 3. Puente UART <-> MQTT:
 *    - Escucha en Serial2 (GPIO 16 = RX2 con divisor de tensión, GPIO 17 = TX2).
 *    - Al recibir telemetría del Nano (Zona 1 / Zona 2), inyecta `timestamp_origen` y publica en:
 *      `lab/piloto/zona1/temp` o `lab/piloto/zona2/temp`.
 *    - Al recibir confirmación ACK del Nano, publica de inmediato en `lab/piloto/ack`.
 *    - Al recibir mensaje MQTT en `lab/piloto/accion`, retransmite la cadena cruda por Serial2 al Nano.
 * 
 * ADVERTENCIA DE HARDWARE:
 * El pin RX2 (GPIO 16) del ESP32 opera a 3.3V. Dado que el Arduino Nano emite a 5V en su TX,
 * se debe conectar un divisor resistivo (ej. 1kΩ en serie y 2kΩ a GND) para proteger el ESP32.
 * =========================================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ================= CONFIGURACIÓN DE RED Y BROKER =================
const char* WIFI_SSID     = "LAB_SISTEMAS_UNT";       // Modificar según la red Wi-Fi local
const char* WIFI_PASSWORD = "PasswordSeguro2026";      // Contraseña de la red

const char* MQTT_BROKER   = "192.168.1.100";          // IP del Host o Servidor EMQX
const int   MQTT_PORT     = 1883;                     // Puerto MQTT sin TLS
const char* MQTT_USER     = "sensor_iot";             // Usuario registrado en emqx_db (mqtt_user)
const char* MQTT_PASS     = "marck124M";              // Contraseña registrada
const char* CLIENT_ID     = "ESP32_Gateway_UNT_01";

// ================= TÓPICOS MQTT =================
const char* TOPIC_ACCION      = "lab/piloto/accion";    // Tópico de órdenes del Backend
const char* TOPIC_ACK         = "lab/piloto/ack";       // Tópico de confirmación del Nano
const char* TOPIC_BASE_SENSOR = "lab/piloto/";          // Prefijo para telemetría: lab/piloto/<zona>/temp

// ================= PINES UART (SERIAL2) =================
#define RX2_PIN 16 // GPIO 16 conectado al divisor de tensión desde TX del Nano
#define TX2_PIN 17 // GPIO 17 conectado directamente a RX del Nano (3.3V es HIGH para TTL 5V)

// Servidor NTP para sincronización horaria precisa
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = -18000; // Zona horaria Perú (UTC-5)
const int   DAYLIGHT_OFFSET_SEC = 0;

// ================= OBJETOS DE COMUNICACIÓN =================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Buffer para ensamblar tramas de texto desde Serial2
String bufferUART = "";
unsigned long ultimaReconexionMQTT = 0;

// ================= DECLARACIÓN DE FUNCIONES =================
void setupWiFi();
void setupNTP();
void reconnectMQTT();
void callbackMQTT(char* topic, byte* payload, unsigned int length);
void procesarTramaUART(const String& trama);
double obtenerTimestampEpoch();

// ================= SETUP =================
void setup() {
    // Serial0 para monitor de depuración local por USB
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[ESP32] Iniciando Gateway IoT de Enfriamiento...");

    // Serial2 para comunicación bidireccional con Arduino Nano
    Serial2.begin(115200, SERIAL_8N1, RX2_PIN, TX2_PIN);
    bufferUART.reserve(512);

    // Conectar a la red Wi-Fi
    setupWiFi();

    // Sincronizar reloj interno con NTP
    setupNTP();

    // Configurar cliente MQTT
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(callbackMQTT);
    mqttClient.setBufferSize(512); // Ampliar buffer para soportar payloads JSON completos
}

// ================= LOOP PRINCIPAL =================
void loop() {
    // 1. Mantener conexión MQTT activa (no bloqueante)
    if (!mqttClient.connected()) {
        unsigned long ahora = millis();
        if (ahora - ultimaReconexionMQTT > 5000) {
            ultimaReconexionMQTT = ahora;
            reconnectMQTT();
        }
    } else {
        mqttClient.loop();
    }

    // 2. Leer datos entrantes desde el Arduino Nano a través de Serial2
    while (Serial2.available() > 0) {
        char c = (char)Serial2.read();
        if (c == '\n' || c == '\r') {
            if (bufferUART.length() > 0) {
                procesarTramaUART(bufferUART);
                bufferUART = "";
            }
        } else {
            bufferUART += c;
        }
    }
}

// ================= GESTIÓN DE WI-FI Y NTP =================

void setupWiFi() {
    delay(10);
    Serial.print("[WiFi] Conectando a red: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 30) {
        delay(500);
        Serial.print(".");
        intentos++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] Conectado exitosamente.");
        Serial.print("[WiFi] Dirección IP asignada: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[WiFi] ⚠️ Tiempo de espera agotado. Continuando para reintento automático...");
    }
}

void setupNTP() {
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.println("[NTP] Sincronizando hora con servidor NTP...");
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 5000)) {
        Serial.println("[NTP] ✅ Hora sincronizada correctamente.");
    } else {
        Serial.println("[NTP] ⚠️ No se pudo obtener hora de inmediato; se usará timestamp relativo.");
    }
}

double obtenerTimestampEpoch() {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    // Retorna timestamp con precisión de microsegundos: segundos + microsegundos/10^6
    return (double)tv.tv_sec + ((double)tv.tv_usec / 1000000.0);
}

// ================= GESTIÓN DE MQTT =================

void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) {
        return; // Esperar reconexión de Wi-Fi primero
    }

    Serial.print("[MQTT] Conectando al broker en ");
    Serial.print(MQTT_BROKER);
    Serial.print("...");

    if (mqttClient.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
        Serial.println(" ¡Conexión establecida!");
        // Suscribirse al canal de órdenes de control
        mqttClient.subscribe(TOPIC_ACCION);
        Serial.print("[MQTT] Suscrito al tópico de acciones: ");
        Serial.println(TOPIC_ACCION);
    } else {
        Serial.print(" Falló conexión, rc=");
        Serial.println(mqttClient.state());
    }
}

/**
 * Callback ejecutado al recibir un mensaje suscrito en MQTT (lab/piloto/accion).
 * Retransmite el payload íntegro vía UART al Arduino Nano.
 */
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
    String mensaje = "";
    for (unsigned int i = 0; i < length; i++) {
        mensaje += (char)payload[i];
    }

    Serial.print("[MQTT -> UART] Comando de acción recibido: ");
    Serial.println(mensaje);

    // Retransmitir al Arduino Nano vía Serial2
    Serial2.println(mensaje);
}

// ================= PROCESAMIENTO DE TRAMAS UART (NANO -> ESP32) =================

/**
 * Procesa la cadena JSON recibida desde el Arduino Nano y la publica en MQTT.
 */
void procesarTramaUART(const String& trama) {
    StaticJsonDocument<384> doc;
    DeserializationError error = deserializeJson(doc, trama);

    if (error) {
        Serial.print("[UART] Error deserializando JSON: ");
        Serial.println(error.c_str());
        return;
    }

    // 1. Caso A: Mensaje de confirmación ACK emitido por el Nano
    if (doc.containsKey("tipo") && strcmp(doc["tipo"], "ack") == 0) {
        // Inyectar marca de tiempo de recepción en gateway
        doc["timestamp_gateway_ack"] = obtenerTimestampEpoch();

        String payloadACK;
        serializeJson(doc, payloadACK);

        if (mqttClient.connected()) {
            mqttClient.publish(TOPIC_ACK, payloadACK.c_str());
            Serial.print("[UART -> MQTT] ACK publicado en ");
            Serial.print(TOPIC_ACK);
            Serial.print(": ");
            Serial.println(payloadACK);
        }
        return;
    }

    // 2. Caso B: Mensaje de telemetría de sensor (Zona 1 o Zona 2)
    if (doc.containsKey("zona") && doc.containsKey("temperatura")) {
        const char* zona = doc["zona"];
        
        // Inyectar timestamp de adquisición preciso (Dimensión 1.1)
        doc["timestamp_origen"] = obtenerTimestampEpoch();

        // Construir tópico destino: ej. "lab/piloto/zona1/temp"
        String topicoDestino = String(TOPIC_BASE_SENSOR) + zona + "/temp";

        String payloadSensor;
        serializeJson(doc, payloadSensor);

        if (mqttClient.connected()) {
            mqttClient.publish(topicoDestino.c_str(), payloadSensor.c_str());
            Serial.print("[UART -> MQTT] Telemetría enviada a [");
            Serial.print(topicoDestino);
            Serial.print("]: ");
            Serial.println(payloadSensor);
        } else {
            Serial.println("[UART -> MQTT] ⚠️ Desconectado de MQTT, telemetría descartada.");
        }
    }
}
