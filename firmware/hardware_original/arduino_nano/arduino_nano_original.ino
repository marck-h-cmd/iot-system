#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <Servo.h>

// ============================================================================
// PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
// FIRMWARE ACTUAL EN PRODUCCIÓN: Arduino Nano (Control Local y Adquisición Unidireccional)
// UNIVERSIDAD: Universidad Nacional de Trujillo
// ============================================================================

// Pines de Conexión
#define PIN_DHT 2         // DHT11 DATA -> D2
#define PIN_DS18B20 3     // DS18B20 1-Wire DATA -> D3 (Pull-up 10 kΩ a 5V)
#define PIN_VENTILADOR 4  // Módulo MOSFET TRIG -> D4
#define PIN_SERVO 5       // Servomotor SG90 SIGNAL -> D5

// Temperaturas de control autónomo local
const float TEMP_ENCENDIDO = 30.0;
const float TEMP_APAGADO = 29.0;

// Barrido del servo (orienta el flujo de aire)
const int ANGULO_MIN = 45;
const int ANGULO_MAX = 135;
const int ANGULO_REPOSO = 90;
const unsigned long PASO_SERVO_MS = 20;  // Velocidad de paso del barrido

// Tiempos de ciclo y conversión
const unsigned long PERIODO_MS = 2000;
const unsigned long ESPERA_CONVERSION_MS = 800;

const float INVALIDO = -999.0;

OneWire oneWire(PIN_DS18B20);
DallasTemperature sensor(&oneWire);
DHT dht(PIN_DHT, DHT11);
Servo servo;

bool ventiladorEncendido = false;
bool esperandoConversion = false;
unsigned long tCiclo = 0;
unsigned long tSolicitud = 0;
unsigned long tServo = 0;

int angulo = ANGULO_REPOSO;
int paso = 1;

float ultimaTempDHT = INVALIDO;
float ultimaHumedad = INVALIDO;

void setup() {
  Serial.begin(9600);

  sensor.begin();
  sensor.setWaitForConversion(false);  // No bloquear el ciclo (el servomotor continúa su barrido)
  dht.begin();

  pinMode(PIN_VENTILADOR, OUTPUT);
  digitalWrite(PIN_VENTILADOR, LOW);

  servo.attach(PIN_SERVO);
  servo.write(ANGULO_REPOSO);

  Serial.println(F("SISTEMA DE ENFRIAMIENTO AUTOMATICO"));
}

void loop() {
  unsigned long ahora = millis();

  // 1) Solicitar conversión de temperatura al DS18B20 cada PERIODO_MS (2 s)
  if (!esperandoConversion && ahora - tCiclo >= PERIODO_MS) {
    sensor.requestTemperatures();
    tSolicitud = ahora;
    tCiclo = ahora;
    esperandoConversion = true;
  }

  // 2) Cuando concluye el tiempo de conversión (800 ms), procesar lecturas
  if (esperandoConversion && ahora - tSolicitud >= ESPERA_CONVERSION_MS) {
    esperandoConversion = false;
    procesarLectura();
  }

  // 3) Actualizar barrido angular del servomotor sin bloqueo
  actualizarServo(ahora);
}

void procesarLectura() {
  float temperatura = sensor.getTempCByIndex(0);

  bool error = (temperatura == DEVICE_DISCONNECTED_C ||
                temperatura < -55.0 ||
                temperatura > 125.0);

  // Lógica de histéresis y protección térmica segura
  if (error) {
    // Ante desconexión o fallo del sensor, ventilador encendido por seguridad obligatoria
    ventiladorEncendido = true;
  }
  else if (temperatura >= TEMP_ENCENDIDO) {
    ventiladorEncendido = true;
  }
  else if (temperatura <= TEMP_APAGADO) {
    ventiladorEncendido = false;
  }

  digitalWrite(PIN_VENTILADOR, ventiladorEncendido ? HIGH : LOW);

  // Lectura del sensor ambiental DHT11
  float h = dht.readHumidity();
  float tc = dht.readTemperature();
  if (!isnan(h)) ultimaHumedad = h;
  if (!isnan(tc)) ultimaTempDHT = tc;

  // Monitor Serial de depuración humana
  Serial.println(F("------------------------"));
  if (error) {
    Serial.println(F("ERROR: DS18B20 desconectado"));
    Serial.println(F("Ventilador: ENCENDIDO (seguridad)"));
  } else {
    Serial.print(F("Temperatura DS18B20: "));
    Serial.print(temperatura, 1);
    Serial.println(F(" C"));
    Serial.print(F("Ventilador: "));
    Serial.println(ventiladorEncendido ? F("ENCENDIDO") : F("APAGADO"));
  }
  Serial.print(F("DHT11: "));
  Serial.print(ultimaTempDHT, 1);
  Serial.print(F(" C, "));
  Serial.print(ultimaHumedad, 1);
  Serial.println(F(" %"));

  // Trama de datos para el ESP32:
  // Formato: DATA,tempDS18B20,tempDHT11,humedad,ventilador,error
  Serial.print(F("DATA,"));
  Serial.print(error ? INVALIDO : temperatura, 1);
  Serial.print(',');
  Serial.print(ultimaTempDHT, 1);
  Serial.print(',');
  Serial.print(ultimaHumedad, 1);
  Serial.print(',');
  Serial.print(ventiladorEncendido ? 1 : 0);
  Serial.print(',');
  Serial.println(error ? 1 : 0);
}

void actualizarServo(unsigned long ahora) {
  if (ventiladorEncendido) {
    if (ahora - tServo >= PASO_SERVO_MS) {
      tServo = ahora;
      angulo += paso;
      if (angulo >= ANGULO_MAX) { angulo = ANGULO_MAX; paso = -1; }
      else if (angulo <= ANGULO_MIN) { angulo = ANGULO_MIN; paso = 1; }
      servo.write(angulo);
    }
  } else if (angulo != ANGULO_REPOSO) {
    angulo = ANGULO_REPOSO;
    paso = 1;
    servo.write(ANGULO_REPOSO);
  }
}
