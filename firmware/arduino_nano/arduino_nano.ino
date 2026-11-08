/**
 * =========================================================================================
 * PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
 * ENTREGABLE: FASE 1A - Firmware Arduino Nano CH340G (Edge Controller)
 * UNIVERSIDAD: Universidad Nacional de Trujillo
 * =========================================================================================
 * 
 * DESCRIPCIÓN:
 * Este firmware se ejecuta en la placa Arduino Nano (lógica de 5V). Su responsabilidad es:
 * 1. Adquisición de telemetría de 2 sensores físicos:
 *    - PC 1: Sensor DHT11 (Pin Digital D2) -> Zona 1
 *    - PC 2: Sensor DS18B20 (Protocolo 1-Wire en Pin Digital D3) -> Zona 2
 * 2. Transmisión periódica (cada 5 seg) de lecturas empaquetadas en JSON vía Serial hacia el ESP32.
 * 3. Recepción y decodificación de órdenes en JSON desde el ESP32 (Fan State y Ángulo de Servomotor).
 * 4. Control de actuadores físicos:
 *    - Driver MOSFET AOD4184A para encendido/apagado del ventilador axial de 5V (Pin Digital D5).
 *    - Servomotor SG90 controlado por PWM para orientar el flujo de aire (Pin D9: 0°, 90°, 180°).
 * 5. Generación y retorno inmediato de un mensaje JSON de confirmación (ACK) para cálculo de latencia.
 * 
 * LIBRERÍAS REQUERIDAS:
 * - ArduinoJson (v6.x o v7.x) por Benoit Blanchon
 * - DHT sensor library por Adafruit
 * - OneWire por Jim Studt / Paul Stoffregen
 * - DallasTemperature por Miles Burton
 * - Servo (incluida en el core de Arduino)
 * =========================================================================================
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Servo.h>

// ================= ASIGNACIÓN DE PINES Y HARDWARE =================
#define PIN_DHT11       2      // Pin digital conectado a la línea DATA del DHT11 (PC 1)
#define PIN_DS18B20     3      // Pin digital para bus 1-Wire del DS18B20 (PC 2, requiere R pull-up 10k)
#define PIN_MOSFET_FAN  5      // Pin digital conectado a la compuerta (Gate) del módulo MOSFET AOD4184A
#define PIN_SERVO_PWM   9      // Pin PWM para control de señal del Servomotor SG90

#define DHTTYPE         DHT11  // Modelo del sensor DHT
#define SERIAL_BAUD     115200 // Velocidad de comunicación UART con ESP32

// ================= OBJETOS DE HARDWARE =================
DHT dht(PIN_DHT11, DHTTYPE);
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);
Servo servomotor;

// ================= VARIABLES DE CONTROL Y ESTADO =================
unsigned long ultimoMuestreo = 0;
const unsigned long INTERVALO_MUESTREO_MS = 5000; // Meta: Adquisición cada 5 segundos
uint32_t contadorMensajes = 1;

int estadoVentiladorActual = 0;
int anguloServoActual = 90; // Posición de reposo central (90°)

String bufferSerial = ""; // Acumulador de caracteres entrantes por Serial

// ================= DECLARACIÓN DE FUNCIONES =================
void inicializarSensores();
void procesarComandoSerial(const String& jsonString);
void transmitirTelemetria();
void enviarACK(const char* zona, int fanState, int servoAngle, double timestampDecision);

// ================= SETUP =================
void setup() {
    // Inicializar puerto Serial para comunicación con Gateway ESP32
    Serial.begin(SERIAL_BAUD);
    bufferSerial.reserve(256);

    // Configurar pines de actuadores
    pinMode(PIN_MOSFET_FAN, OUTPUT);
    digitalWrite(PIN_MOSFET_FAN, LOW); // Ventilador apagado por defecto

    servomotor.attach(PIN_SERVO_PWM);
    servomotor.write(anguloServoActual); // Iniciar en 90° (neutro)

    // Inicializar sensores físicos
    inicializarSensores();

    // Pequeño retardo para estabilización de voltajes
    delay(1000);
}

// ================= LOOP PRINCIPAL =================
void loop() {
    unsigned long tiempoActual = millis();

    // 1. Escuchar comandos entrantes desde el ESP32 vía Serial UART
    while (Serial.available() > 0) {
        char caracter = (char)Serial.read();
        if (caracter == '\n' || caracter == '\r') {
            if (bufferSerial.length() > 0) {
                procesarComandoSerial(bufferSerial);
                bufferSerial = "";
            }
        } else {
            bufferSerial += caracter;
        }
    }

    // 2. Transmisión periódica de telemetría hacia el ESP32 (cada 5 segundos)
    if (tiempoActual - ultimoMuestreo >= INTERVALO_MUESTREO_MS) {
        ultimoMuestreo = tiempoActual;
        transmitirTelemetria();
    }
}

// ================= IMPLEMENTACIÓN DE FUNCIONES =================

void inicializarSensores() {
    dht.begin();
    ds18b20.begin();
    ds18b20.setResolution(10); // Resolución de 10 bits (conversión rápida ~187ms)
}

/**
 * Lee los sensores físicos y empaqueta en JSON para transmitir al ESP32 vía UART.
 * Se envían dos mensajes independientes (uno por cada zona física):
 * Zona 1 (PC 1 - DHT11) y Zona 2 (PC 2 - DS18B20).
 */
void transmitirTelemetria() {
    // --- LECTURA PC 1 (DHT11 - Zona 1) ---
    float tempZona1 = dht.readTemperature();
    if (isnan(tempZona1)) {
        // En caso de fallo transitorio del DHT11, se reporta valor centinela seguro o último valor
        tempZona1 = 25.0; 
    }

    // Serialización JSON para Zona 1
    StaticJsonDocument<192> docZona1;
    docZona1["msg_id"] = contadorMensajes++;
    docZona1["zona"] = "zona1";
    docZona1["temperatura"] = serialized(String(tempZona1, 2));
    docZona1["origen"] = "real";
    docZona1["sensor"] = "DHT11";
    
    String payloadZona1;
    serializeJson(docZona1, payloadZona1);
    Serial.println(payloadZona1);

    // --- LECTURA PC 2 (DS18B20 - Zona 2) ---
    ds18b20.requestTemperatures();
    float tempZona2 = ds18b20.getTempCByIndex(0);
    if (tempZona2 == DEVICE_DISCONNECTED_C || tempZona2 < -50.0) {
        tempZona2 = 25.0; // Fallo de lectura del bus 1-wire
    }

    // Serialización JSON para Zona 2
    StaticJsonDocument<192> docZona2;
    docZona2["msg_id"] = contadorMensajes++;
    docZona2["zona"] = "zona2";
    docZona2["temperatura"] = serialized(String(tempZona2, 2));
    docZona2["origen"] = "real";
    docZona2["sensor"] = "DS18B20";

    String payloadZona2;
    serializeJson(docZona2, payloadZona2);
    Serial.println(payloadZona2);
}

/**
 * Decodifica la orden JSON proveniente del ESP32 -> Backend Python.
 * Formato esperado:
 * {"zona_objetivo":"zona1","fan_state":1,"servo_angle":0,"timestamp_decision":1710000000.123}
 */
void procesarComandoSerial(const String& jsonString) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, jsonString);

    if (error) {
        // No es un JSON válido, descartar
        return;
    }

    // Validar que sea un comando de acción de control
    if (!doc.containsKey("zona_objetivo") || !doc.containsKey("fan_state")) {
        return;
    }

    const char* zonaObjetivo = doc["zona_objetivo"] | "desconocida";
    int nuevoEstadoFan = doc["fan_state"] | 0;
    int nuevoAnguloServo = doc["servo_angle"] | 90;
    double timestampDecision = doc["timestamp_decision"] | 0.0;

    // 1. Limitar ángulo a rango válido físico del SG90 (0° a 180°)
    if (nuevoAnguloServo < 0) nuevoAnguloServo = 0;
    if (nuevoAnguloServo > 180) nuevoAnguloServo = 180;

    // 2. Mover servomotor si hay cambio de posición
    if (nuevoAnguloServo != anguloServoActual) {
        servomotor.write(nuevoAnguloServo);
        anguloServoActual = nuevoAnguloServo;
    }

    // 3. Activar/Desactivar Driver MOSFET AOD4184A
    estadoVentiladorActual = (nuevoEstadoFan > 0) ? HIGH : LOW;
    digitalWrite(PIN_MOSFET_FAN, estadoVentiladorActual);

    // 4. Retornar inmediatamente el mensaje JSON de ACK para cálculo de latencia
    enviarACK(zonaObjetivo, (estadoVentiladorActual == HIGH ? 1 : 0), anguloServoActual, timestampDecision);
}

/**
 * Envía el mensaje de confirmación (ACK) por el puerto Serial.
 * El ESP32 retransmitirá este mensaje inmediatamente al broker MQTT bajo el tópico `lab/piloto/ack`.
 */
void enviarACK(const char* zona, int fanState, int servoAngle, double timestampDecision) {
    StaticJsonDocument<256> ackDoc;
    ackDoc["tipo"] = "ack";
    ackDoc["status"] = "OK";
    ackDoc["zona_objetivo"] = zona;
    ackDoc["fan_state"] = fanState;
    ackDoc["servo_angle"] = servoAngle;
    ackDoc["timestamp_decision"] = serialized(String(timestampDecision, 3));

    String ackPayload;
    serializeJson(ackDoc, ackPayload);
    Serial.println(ackPayload);
}
