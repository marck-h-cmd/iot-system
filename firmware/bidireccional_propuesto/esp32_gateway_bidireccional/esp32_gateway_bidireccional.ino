#include <WiFi.h>
#include <WebServer.h>

// ============================================================================
// PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
// FIRMWARE PROPUESTO: ESP32 Gateway HTTP Bidireccional (Fase 3)
// UNIVERSIDAD: Universidad Nacional de Trujillo
// ============================================================================
// MODIFICACIONES RESPECTO AL ORIGINAL:
// 1. Usa Serial2 TX (GPIO17) para enviar órdenes hacia el pin D0 (RX) del Arduino Nano.
// 2. Agrega endpoint POST /control para recibir órdenes remotas desde FastAPI.
// 3. Captura tramas ACK del Nano y mide la latencia de confirmación por hardware.
// 4. Extiende el JSON de /datos con el ángulo actual y el modo de control.
// ============================================================================

const char* WIFI_SSID  = "NOMBRE_DE_TU_WIFI";
const char* WIFI_CLAVE = "CLAVE_DE_TU_WIFI";

// Pines Serial2
#define RX_ARDUINO 16 // Recibe de Nano TX (D1) mediante divisor resistivo 1k/2k
#define TX_ARDUINO 17 // Envía a Nano RX (D0)

WebServer servidor(80);

float tempDS = -999.0, tempDHT = -999.0, humedad = -999.0;
bool ventilador = false, errorSensor = false;
int anguloActual = 90;
String modoActual = "autonomo";

bool hayDatos = false;
unsigned long ultimoDato = 0;
String lineaSerial = "";

// Variables para correlación de órdenes y confirmaciones ACK
bool ackPendiente = false;
unsigned long tEnvioComando = 0;
String ultimoAckRecibido = "";

String valor(float x) {
  return (x <= -900.0) ? String("null") : String(x, 1);
}

void enviarDatos() {
  long edad = hayDatos ? (long)((millis() - ultimoDato) / 1000) : -1;
  String j = "{";
  j += "\"temp\":" + valor(tempDS) + ",";
  j += "\"tdht\":" + valor(tempDHT) + ",";
  j += "\"hum\":" + valor(humedad) + ",";
  j += "\"ventilador\":" + String(ventilador ? "true" : "false") + ",";
  j += "\"error\":" + String(errorSensor ? "true" : "false") + ",";
  j += "\"angulo\":" + String(anguloActual) + ",";
  j += "\"modo\":\"" + modoActual + "\",";
  j += "\"edad\":" + String(edad);
  j += "}";
  servidor.send(200, "application/json", j);
}

// Endpoint POST /control: Recibe órdenes desde FastAPI y las retransmite al Nano
// Formato JSON esperado: {"fan": 1, "servo": 90, "mode": "manual"}
void manejarControlRemoto() {
  if (servidor.method() != HTTP_POST) {
    servidor.send(405, "application/json", "{\"error\":\"Método no permitido. Use POST.\"}");
    return;
  }

  String cuerpo = servidor.arg("plain");
  int fanCmd = -1;
  int servoCmd = -1;
  String modeCmd = "AUTO";

  // Parseo ligero sin dependencias pesadas
  if (cuerpo.indexOf("\"fan\":1") >= 0 || cuerpo.indexOf("\"fan\":true") >= 0) fanCmd = 1;
  if (cuerpo.indexOf("\"fan\":0") >= 0 || cuerpo.indexOf("\"fan\":false") >= 0) fanCmd = 0;

  int idxServo = cuerpo.indexOf("\"servo\":");
  if (idxServo >= 0) {
    int start = idxServo + 8;
    int end = cuerpo.indexOfAny(",}", start);
    if (end > start) servoCmd = cuerpo.substring(start, end).toInt();
  }

  if (cuerpo.indexOf("\"mode\":\"manual\"") >= 0 || cuerpo.indexOf("\"mode\":\"MANUAL\"") >= 0) {
    modeCmd = "MANUAL";
  } else if (cuerpo.indexOf("\"mode\":\"autonomo\"") >= 0 || cuerpo.indexOf("\"mode\":\"AUTO\"") >= 0) {
    modeCmd = "AUTO";
  }

  // Construir comando UART para el Nano: CMD,FAN=<0|1>,SERVO=<angulo>,MODE=<AUTO|MANUAL>
  String cmdUart = "CMD,";
  if (fanCmd >= 0) cmdUart += "FAN=" + String(fanCmd) + ",";
  if (servoCmd >= 0) cmdUart += "SERVO=" + String(servoCmd) + ",";
  cmdUart += "MODE=" + modeCmd;

  ackPendiente = true;
  ultimoAckRecibido = "";
  tEnvioComando = millis();

  // Enviar por Serial2 al Arduino
  Serial2.println(cmdUart);
  Serial.print(F("[TX->Nano] "));
  Serial.println(cmdUart);

  // Esperar confirmación ACK durante máximo 600 ms
  unsigned long tInicioEspera = millis();
  while (ackPendiente && (millis() - tInicioEspera < 600)) {
    leerSerialArduino();
    delay(10);
  }

  unsigned long latenciaMs = millis() - tEnvioComando;

  if (!ackPendiente) {
    // Éxito: El Nano respondió con ACK
    String resp = "{";
    resp += "\"status\":\"ok\",";
    resp += "\"ack_recibido\":true,";
    resp += "\"latencia_uart_ms\":" + String(latenciaMs) + ",";
    resp += "\"ack_raw\":\"" + ultimoAckRecibido + "\"";
    resp += "}";
    servidor.send(200, "application/json", resp);
  } else {
    // Timeout esperando al Nano
    ackPendiente = false;
    servidor.send(504, "application/json", "{\"status\":\"timeout\",\"error\":\"El Arduino Nano no respondió a tiempo.\"}");
  }
}

// Procesa tramas DATA y ACK del Arduino
void procesarLinea(const String& l) {
  if (l.startsWith("DATA,")) {
    // DATA,tempDS,tempDHT,humedad,ventilador,error[,angulo,modo]
    float v[7];
    int n = 0;
    int ini = 5;
    while (n < 7) {
      int coma = l.indexOf(',', ini);
      String campo = (coma < 0) ? l.substring(ini) : l.substring(ini, coma);
      v[n++] = campo.toFloat();
      if (coma < 0) break;
      ini = coma + 1;
    }
    if (n >= 5) {
      tempDS = v[0];
      tempDHT = v[1];
      humedad = v[2];
      ventilador = (v[3] > 0.5);
      errorSensor = (v[4] > 0.5);
      if (n >= 6) anguloActual = (int)v[5];
      if (n >= 7) modoActual = (v[6] > 0.5) ? "manual" : "autonomo";

      hayDatos = true;
      ultimoDato = millis();
    }
  } else if (l.startsWith("ACK,")) {
    // ACK,FAN=<0|1>,SERVO=<angulo>,MODE=<AUTO|MANUAL>,OVERRIDE=<0|1>
    ultimoAckRecibido = l;
    ackPendiente = false;
    Serial.print(F("[RX<-Nano ACK] "));
    Serial.println(l);
  }
}

void leerSerialArduino() {
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n') {
      lineaSerial.trim();
      if (lineaSerial.length() > 0) {
        procesarLinea(lineaSerial);
      }
      lineaSerial = "";
    } else if (c != '\r' && lineaSerial.length() < 120) {
      lineaSerial += c;
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RX_ARDUINO, TX_ARDUINO);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);
  Serial.print(F("Conectando a WiFi"));
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  Serial.print(F("Gateway iniciado en: http://"));
  Serial.println(WiFi.localIP());

  servidor.on("/", []() {
    servidor.send(200, "text/html", "<h2>Smart Cooling - ESP32 Gateway Bidireccional</h2><p>Estado operativo.</p>");
  });
  servidor.on("/datos", HTTP_GET, enviarDatos);
  servidor.on("/control", HTTP_POST, manejarControlRemoto);
  servidor.begin();
}

void loop() {
  servidor.handleClient();
  leerSerialArduino();
}
