#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <Servo.h>

const uint8_t PIN_DHT = 2;
const uint8_t PIN_DS18B20 = 3;
const uint8_t PIN_VENTILADOR = 4;
const uint8_t PIN_SERVO = 5;

const float TEMP_ENCENDIDO = 30.0;
const float TEMP_APAGADO = 29.0;
const float INVALIDO = -999.0;

// Calibrar con la paleta montada. Intercambiar si el aire va al lado opuesto.
const uint8_t ANGULO_DS18B20 = 45;
const uint8_t ANGULO_DHT11 = 135;
const uint8_t ANGULO_REPOSO = 90;
const uint8_t ANGULO_MINIMO = 45;
const uint8_t ANGULO_MAXIMO = 135;
const unsigned long PASO_SERVO_MS = 20;
const unsigned long TURNO_MS = 20000;
const unsigned long PERIODO_MS = 2500;
const unsigned long ESPERA_CONVERSION_MS = 800;
const unsigned long CONTROL_MANUAL_MS = 30000;

enum Direccion : uint8_t { REPOSO, DS18B20, DHT11_ZONA };

OneWire oneWire(PIN_DS18B20);
DallasTemperature sensor(&oneWire);
DHT dht(PIN_DHT, DHT11);
Servo servo;

bool demandaDS = false;
bool demandaDHT = false;
bool esperandoConversion = false;
unsigned long tSolicitud = 0;
unsigned long tInicioTurno = 0;
unsigned long tPasoServo = 0;
Direccion direccion = REPOSO;
uint8_t angulo = ANGULO_REPOSO;
uint8_t anguloObjetivo = ANGULO_REPOSO;
uint8_t anguloAutomatico = ANGULO_REPOSO;
bool sensoresValidos = false;
bool modoManual = false;
bool pausaManual = false;
bool fanManual = false;
bool fanActivo = false;
uint8_t anguloManual = ANGULO_REPOSO;
unsigned long inicioManual = 0;

bool actualizarDemanda(float temperatura, bool demandaAnterior) {
  return temperatura >= TEMP_ENCENDIDO ||
         (temperatura > TEMP_APAGADO && demandaAnterior);
}

void orientarAire(bool enfriarDS, bool enfriarDHT, float tempDS, float tempDHT,
                  unsigned long ahora) {
  Direccion siguiente = direccion;
  if (enfriarDS && enfriarDHT) {
    if (direccion == REPOSO) {
      siguiente = tempDHT > tempDS ? DHT11_ZONA : DS18B20;
    } else if (ahora - tInicioTurno >= TURNO_MS) {
      siguiente = direccion == DS18B20 ? DHT11_ZONA : DS18B20;
    }
  } else if (enfriarDS) {
    siguiente = DS18B20;
  } else if (enfriarDHT) {
    siguiente = DHT11_ZONA;
  } else {
    siguiente = REPOSO;
  }

  if (siguiente != direccion) {
    direccion = siguiente;
    tInicioTurno = ahora;
    switch (direccion) {
      case DS18B20: anguloAutomatico = ANGULO_DS18B20; break;
      case DHT11_ZONA: anguloAutomatico = ANGULO_DHT11; break;
      case REPOSO: anguloAutomatico = ANGULO_REPOSO; break;
    }
  }
}

void aplicarActuadores() {
  const bool manualDisponible = modoManual && sensoresValidos;
  if (manualDisponible && pausaManual) {
    fanActivo = false;
    anguloObjetivo = angulo;
    digitalWrite(PIN_VENTILADOR, LOW);
    if (servo.attached()) servo.detach();
    digitalWrite(PIN_SERVO, LOW);
    return;
  }

  if (!servo.attached()) {
    servo.write(angulo);
    servo.attach(PIN_SERVO);
  }
  fanActivo = direccion != REPOSO || (manualDisponible && fanManual);
  anguloObjetivo = manualDisponible ? anguloManual : anguloAutomatico;
  digitalWrite(PIN_VENTILADOR, fanActivo ? HIGH : LOW);
}

void procesarComando(char* linea, unsigned long ahora) {
  char* siguiente = nullptr;
  const char* prefijo = strtok_r(linea, ",", &siguiente);
  if (!prefijo || strcmp(prefijo, "CMD") != 0) return;
  const char* id = strtok_r(nullptr, ",", &siguiente);
  const char* modo = strtok_r(nullptr, ",", &siguiente);
  if (!id || strlen(id) != 12 || strspn(id, "0123456789abcdef") != 12 || !modo) return;

  const bool manualSolicitado = strcmp(modo, "MANUAL") == 0;
  const bool pausaSolicitada = strcmp(modo, "PAUSA") == 0;
  if (manualSolicitado) {
    const char* fan = strtok_r(nullptr, ",", &siguiente);
    const char* grados = strtok_r(nullptr, ",", &siguiente);
    if (!fan || strlen(fan) != 1 || (fan[0] != '0' && fan[0] != '1') ||
        !grados || strtok_r(nullptr, ",", &siguiente)) return;
    char* fin = nullptr;
    const long valor = strtol(grados, &fin, 10);
    if (fin == grados || *fin || valor < ANGULO_MINIMO || valor > ANGULO_MAXIMO) return;
    modoManual = sensoresValidos;
    pausaManual = false;
    fanManual = fan[0] == '1';
    anguloManual = static_cast<uint8_t>(valor);
    inicioManual = ahora;
  } else if (pausaSolicitada && !strtok_r(nullptr, ",", &siguiente)) {
    modoManual = sensoresValidos;
    pausaManual = modoManual;
    inicioManual = ahora;
  } else if (strcmp(modo, "AUTO") == 0 && !strtok_r(nullptr, ",", &siguiente)) {
    modoManual = false;
    pausaManual = false;
  } else {
    return;
  }

  aplicarActuadores();
  Serial.print(F("ACK,"));
  Serial.print(id);
  Serial.print(',');
  Serial.print(fanActivo);
  Serial.print(',');
  Serial.print(anguloObjetivo);
  Serial.print(',');
  Serial.print(modoManual);
  Serial.print(',');
  Serial.print((manualSolicitado && (!modoManual || fanActivo != fanManual)) ||
               (pausaSolicitada && !pausaManual));
  Serial.print(',');
  Serial.println(servo.attached());
}

void leerComandos(unsigned long ahora) {
  static char linea[48];
  static uint8_t longitud = 0;
  static bool desbordada = false;
  while (Serial.available()) {
    const char c = Serial.read();
    if (c == '\n') {
      linea[longitud] = '\0';
      if (!desbordada) procesarComando(linea, ahora);
      longitud = 0;
      desbordada = false;
    } else if (c != '\r') {
      if (longitud < sizeof(linea) - 1) linea[longitud++] = c;
      else desbordada = true;
    }
  }
}

void actualizarServo(unsigned long ahora) {
  if (angulo == anguloObjetivo || ahora - tPasoServo < PASO_SERVO_MS) return;
  tPasoServo = ahora;
  if (angulo < anguloObjetivo) ++angulo;
  else --angulo;
  servo.write(angulo);
}

void procesarLectura(unsigned long ahora) {
  const float tempDS = sensor.getTempCByIndex(0);
  const float tempDHT = dht.readTemperature();
  const float humedad = dht.readHumidity();
  const bool errorDS = isnan(tempDS) || tempDS == DEVICE_DISCONNECTED_C ||
                       tempDS < -55.0 || tempDS > 125.0;
  const bool errorDHT = isnan(tempDHT);

  sensoresValidos = !errorDS && !errorDHT;
  if (!sensoresValidos) {
    modoManual = false;
    pausaManual = false;
  }
  if (!errorDS) demandaDS = actualizarDemanda(tempDS, demandaDS);
  if (!errorDHT) demandaDHT = actualizarDemanda(tempDHT, demandaDHT);
  orientarAire(errorDS || demandaDS, errorDHT || demandaDHT,
               errorDS ? INVALIDO : tempDS, errorDHT ? INVALIDO : tempDHT, ahora);
  aplicarActuadores();

  // El ESP32 anterior usa los cinco campos originales.
  // DATA,tempDS,tempDHT,humedad,ventilador,errorDS,AIR,angulo,direccion,manual,proteccion,servo_activo
  Serial.print(F("DATA,"));
  Serial.print(errorDS ? INVALIDO : tempDS, 1);
  Serial.print(',');
  Serial.print(errorDHT ? INVALIDO : tempDHT, 1);
  Serial.print(',');
  Serial.print(isnan(humedad) ? INVALIDO : humedad, 1);
  Serial.print(',');
  Serial.print(fanActivo);
  Serial.print(',');
  Serial.print(errorDS ? 1 : 0);
  Serial.print(F(",AIR,"));
  Serial.print(angulo);
  Serial.print(',');
  Serial.print(static_cast<uint8_t>(direccion));
  Serial.print(',');
  Serial.print(modoManual);
  Serial.print(',');
  Serial.print(!sensoresValidos || direccion != REPOSO);
  Serial.print(',');
  Serial.println(servo.attached());
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_VENTILADOR, OUTPUT);
  digitalWrite(PIN_VENTILADOR, LOW);
  servo.attach(PIN_SERVO);
  servo.write(ANGULO_REPOSO);
  sensor.begin();
  sensor.setWaitForConversion(false);
  dht.begin();
}

void loop() {
  const unsigned long ahora = millis();
  if (modoManual && ahora - inicioManual >= CONTROL_MANUAL_MS) {
    modoManual = false;
    pausaManual = false;
    aplicarActuadores();
  }
  leerComandos(ahora);
  if (!esperandoConversion && ahora - tSolicitud >= PERIODO_MS) {
    sensor.requestTemperatures();
    tSolicitud = ahora;
    esperandoConversion = true;
  }
  if (esperandoConversion && ahora - tSolicitud >= ESPERA_CONVERSION_MS) {
    esperandoConversion = false;
    procesarLectura(ahora);
  }
  actualizarServo(ahora);
}
