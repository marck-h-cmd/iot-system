#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <Servo.h>

// ============================================================================
// PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
// FIRMWARE PROPUESTO: Arduino Nano - Control Bidireccional Seguro (Fase 3)
// UNIVERSIDAD: Universidad Nacional de Trujillo
// ============================================================================
// NOTA IMPORTANTE DE CABLEADO PARA ESTA FASE:
// Requiere conectar la línea de transmisión del ESP32 (GPIO17 TX) hacia el
// pin digital RX del Arduino Nano (Pin D0).
// Como el ESP32 emite 3.3V y el Nano lee lógica TTL (V_IH >= 3.0V), funciona
// directamente, o preferiblemente con un desplazador de nivel lógico (Level Shifter).
// ============================================================================

#define PIN_DHT 2         // Sensor DHT11
#define PIN_DS18B20 3     // Sensor DS18B20 (Pull-up 10k a 5V)
#define PIN_VENTILADOR 4  // MOSFET Gate
#define PIN_SERVO 5       // Señal PWM Servo SG90

// Umbrales de seguridad autónoma
const float TEMP_ENCENDIDO = 30.0;
const float TEMP_APAGADO = 29.0;

// Límites físicos de barrido angular
const int ANGULO_MIN = 45;
const int ANGULO_MAX = 135;
const int ANGULO_REPOSO = 90;
const unsigned long PASO_SERVO_MS = 20;

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
float ultimaTempDS = INVALIDO;
bool ultimoErrorSensor = false;

// Estado de modo de operación del Arduino
enum ModoOperacion { MODO_AUTONOMO, MODO_MANUAL };
ModoOperacion modoActual = MODO_AUTONOMO;
int anguloManualObjetivo = ANGULO_REPOSO;
bool ventiladorManualObjetivo = false;
bool bloqueoSeguridadTermica = false;

String bufferComando = "";

void procesarComandoSerial(const String& cmd);
void actualizarActuadoresSeguros();
void procesarLectura();
void actualizarServo(unsigned long ahora);

void setup() {
  Serial.begin(9600);

  sensor.begin();
  sensor.setWaitForConversion(false);
  dht.begin();

  pinMode(PIN_VENTILADOR, OUTPUT);
  digitalWrite(PIN_VENTILADOR, LOW);

  servo.attach(PIN_SERVO);
  servo.write(ANGULO_REPOSO);

  Serial.println(F("SISTEMA ENFRIAMIENTO - NANO BIDIRECCIONAL INICIADO"));
}

void loop() {
  unsigned long ahora = millis();

  // 1) Escuchar comandos entrantes desde el ESP32 (Pin D0 RX)
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      procesarComandoSerial(bufferComando);
      bufferComando = "";
    } else if (c != '\r' && bufferComando.length() < 80) {
      bufferComando += c;
    }
  }

  // 2) Ciclo de adquisición térmica cada 2 segundos
  if (!esperandoConversion && ahora - tCiclo >= PERIODO_MS) {
    sensor.requestTemperatures();
    tSolicitud = ahora;
    tCiclo = ahora;
    esperandoConversion = true;
  }

  if (esperandoConversion && ahora - tSolicitud >= ESPERA_CONVERSION_MS) {
    esperandoConversion = false;
    procesarLectura();
  }

  // 3) Actualización física del servomotor
  actualizarServo(ahora);
}

void procesarLectura() {
  float temp = sensor.getTempCByIndex(0);
  bool error = (temp == DEVICE_DISCONNECTED_C || temp < -55.0 || temp > 125.0);

  ultimaTempDS = temp;
  ultimoErrorSensor = error;

  // Lógica de decisión autónoma
  if (error || temp >= TEMP_ENCENDIDO) {
    bloqueoSeguridadTermica = true;
  } else if (temp <= TEMP_APAGADO) {
    bloqueoSeguridadTermica = false;
  }

  // Aplicar estado según modo actual con prioridad de seguridad
  actualizarActuadoresSeguros();

  // Lectura DHT11
  float h = dht.readHumidity();
  float tc = dht.readTemperature();
  if (!isnan(h)) ultimaHumedad = h;
  if (!isnan(tc)) ultimaTempDHT = tc;

  // Enviar trama extendida al ESP32:
  // DATA,tempDS,tempDHT,humedad,ventilador,error,angulo,modo(0=auto,1=manual)
  Serial.print(F("DATA,"));
  Serial.print(error ? INVALIDO : temp, 1);
  Serial.print(',');
  Serial.print(ultimaTempDHT, 1);
  Serial.print(',');
  Serial.print(ultimaHumedad, 1);
  Serial.print(',');
  Serial.print(ventiladorEncendido ? 1 : 0);
  Serial.print(',');
  Serial.print(error ? 1 : 0);
  Serial.print(',');
  Serial.print(angulo);
  Serial.print(',');
  Serial.println(modoActual == MODO_MANUAL ? 1 : 0);
}

void actualizarActuadoresSeguros() {
  if (bloqueoSeguridadTermica) {
    // Si la temperatura es crítica (>= 30°C) o el sensor falla, 
    // EL VENTILADOR SE ENCIENDE OBLIGATORIAMENTE, anulando cualquier orden manual de apagado.
    ventiladorEncendido = true;
  } else if (modoActual == MODO_MANUAL) {
    ventiladorEncendido = ventiladorManualObjetivo;
  } else {
    // Modo autónomo por debajo de 29°C
    if (ultimaTempDS <= TEMP_APAGADO && !ultimoErrorSensor) {
      ventiladorEncendido = false;
    }
  }

  digitalWrite(PIN_VENTILADOR, ventiladorEncendido ? HIGH : LOW);
}

// Protocolo de órdenes recibido del ESP32:
// Formato: CMD,FAN=<0|1>,SERVO=<45-135>,MODE=<AUTO|MANUAL>
void procesarComandoSerial(const String& cmd) {
  if (!cmd.startsWith("CMD,")) return;

  int fanVal = -1;
  int servoVal = -1;
  String modoStr = "";

  int idx = 4;
  while (idx < cmd.length()) {
    int nextComma = cmd.indexOf(',', idx);
    String token = (nextComma < 0) ? cmd.substring(idx) : cmd.substring(idx, nextComma);
    
    if (token.startsWith("FAN=")) {
      fanVal = token.substring(4).toInt();
    } else if (token.startsWith("SERVO=")) {
      servoVal = token.substring(6).toInt();
    } else if (token.startsWith("MODE=")) {
      modoStr = token.substring(5);
    }

    if (nextComma < 0) break;
    idx = nextComma + 1;
  }

  if (modoStr == "MANUAL") {
    modoActual = MODO_MANUAL;
  } else if (modoStr == "AUTO") {
    modoActual = MODO_AUTONOMO;
  }

  if (modoActual == MODO_MANUAL) {
    if (fanVal == 0 || fanVal == 1) {
      ventiladorManualObjetivo = (fanVal == 1);
    }
    if (servoVal >= ANGULO_MIN && servoVal <= ANGULO_MAX) {
      anguloManualObjetivo = servoVal;
      angulo = anguloManualObjetivo;
      servo.write(angulo);
    }
  }

  // Aplicar actuadores con chequeo de seguridad
  actualizarActuadoresSeguros();

  // Responder inmediatamente ACK al ESP32:
  // ACK,FAN=<0|1>,SERVO=<angulo>,MODE=<AUTO|MANUAL>,OVERRIDE=<0|1>
  Serial.print(F("ACK,FAN="));
  Serial.print(ventiladorEncendido ? 1 : 0);
  Serial.print(F(",SERVO="));
  Serial.print(angulo);
  Serial.print(F(",MODE="));
  Serial.print(modoActual == MODO_MANUAL ? F("MANUAL") : F("AUTO"));
  Serial.print(F(",OVERRIDE="));
  Serial.println((bloqueoSeguridadTermica && fanVal == 0) ? 1 : 0);
}

void actualizarServo(unsigned long ahora) {
  if (modoActual == MODO_MANUAL) {
    // En modo manual, el servomotor permanece en la posición fijada por el usuario
    return;
  }

  // En modo autónomo, si el ventilador está encendido, realiza barrido continuo
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
