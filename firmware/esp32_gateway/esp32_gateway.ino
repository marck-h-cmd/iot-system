#include <WiFi.h>
#include <WebServer.h>

// ============================================================================
// PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)
// FIRMWARE PRODUCCIÓN: ESP32 Gateway HTTP Unidireccional
// UNIVERSIDAD: Universidad Nacional de Trujillo
// ============================================================================

// ====== CONFIGURACIÓN DE RED WI-FI (Configurar según el router) ======
const char* WIFI_SSID  = "NOMBRE_DE_TU_WIFI";
const char* WIFI_CLAVE = "CLAVE_DE_TU_WIFI";
// ===================================================================

// Serial2 del ESP32: 
// RX = GPIO16 (recibe del TX D1 del Nano vía divisor resistivo 1k / 2k)
// TX = GPIO17 (actualmente sin uso físico)
#define RX_ARDUINO 16
#define TX_ARDUINO 17

WebServer servidor(80);

float tempDS = -999.0, tempDHT = -999.0, humedad = -999.0;
bool ventilador = false, errorSensor = false;
int angulo = -1;
const char* direccion = nullptr;
bool hayDatos = false;
unsigned long ultimoDato = 0;
String linea = "";

const char PAGINA[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sistema de Enfriamiento IoT - Gateway</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 480px; margin: 24px auto; padding: 0 16px; background: #0B1220; color: #F8FAFC; }
  h1 { font-size: 1.2rem; border-bottom: 1px solid #334155; padding-bottom: 8px; }
  .fila { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1E293B; font-size: 0.95rem; }
  .fila[hidden] { display: none; }
  .valor { font-weight: 700; color: #38BDF8; }
  #estado { margin-top: 16px; font-size: 0.85rem; color: #94A3B8; }
</style>
</head>
<body>
<h1>Sistema de Enfriamiento - Gateway ESP32</h1>
<div class="fila"><span>Temperatura DS18B20</span><span class="valor" id="temp">--</span></div>
<div class="fila"><span>Temperatura DHT11</span><span class="valor" id="tdht">--</span></div>
<div class="fila"><span>Humedad DHT11</span><span class="valor" id="hum">--</span></div>
<div class="fila"><span>Ventilador</span><span class="valor" id="fan">--</span></div>
<div class="fila" id="direccionFila" hidden><span>Dirección del aire</span><span class="valor" id="direccion"></span></div>
<div id="estado">Conectando...</div>
<script>
function fmt(v, u) { return v === null ? "--" : v.toFixed(1) + " " + u; }
async function actualizar() {
  try {
    const r = await fetch("/datos");
    const d = await r.json();
    const vigente = d.edad >= 0 && d.edad <= 15;
    document.getElementById("temp").textContent = vigente && d.error ? "ERROR sensor" : fmt(vigente ? d.temp : null, "°C");
    document.getElementById("tdht").textContent = fmt(vigente ? d.tdht : null, "°C");
    document.getElementById("hum").textContent = fmt(vigente ? d.hum : null, "%");
    document.getElementById("fan").textContent = vigente ? (d.ventilador ? "ENCENDIDO" : "APAGADO") : "--";
    const direccion = {ds18b20: "DS18B20", dht11: "DHT11", reposo: "Reposo"}[d.direccion];
    document.getElementById("direccionFila").hidden = !vigente || !direccion;
    document.getElementById("direccion").textContent = direccion ? direccion + " · " + d.angulo + "°" : "";
    document.getElementById("estado").textContent =
      d.edad < 0 ? "Sin datos del Arduino todavía"
      : d.edad > 15 ? "Sin datos del Arduino hace " + d.edad + " s"
      : "Actualizado hace " + d.edad + " s";
  } catch (e) {
    document.getElementById("estado").textContent = "Sin conexión con el ESP32";
    for (const id of ["temp", "tdht", "hum", "fan"]) document.getElementById(id).textContent = "--";
    document.getElementById("direccionFila").hidden = true;
  }
}
actualizar();
setInterval(actualizar, 2000);
</script>
</body>
</html>
)rawliteral";

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
  j += "\"edad\":" + String(edad);
  if (direccion != nullptr) {
    j += ",\"angulo\":" + String(angulo);
    j += ",\"direccion\":\"" + String(direccion) + "\"";
  }
  j += "}";
  servidor.send(200, "application/json", j);
}

// La extensión AIR distingue la orientación de otras tramas Nano con campos extra.
void procesarLinea(const String& l) {
  if (!l.startsWith("DATA,")) return;

  float v[5];
  const char* campo = l.c_str() + 5;
  for (int i = 0; i < 5; ++i) {
    char* fin;
    v[i] = strtof(campo, &fin);
    if (fin == campo || !isfinite(v[i])) return;
    if (*fin != ',' && (i < 4 || *fin != '\0')) return;
    campo = i < 4 ? fin + 1 : fin;
  }
  if ((v[3] != 0 && v[3] != 1) || (v[4] != 0 && v[4] != 1)) return;

  angulo = -1;
  direccion = nullptr;
  if (strncmp(campo, ",AIR,", 5) == 0) {
    char* fin;
    const long grados = strtol(campo + 5, &fin, 10);
    if (fin != campo + 5 && *fin == ',' && grados >= 0 && grados <= 180 &&
        fin[1] >= '0' && fin[1] <= '2' && (fin[2] == '\0' || fin[2] == ',')) {
      angulo = static_cast<int>(grados);
      direccion = fin[1] == '0' ? "reposo" : fin[1] == '1' ? "ds18b20" : "dht11";
    }
  }

  tempDS = v[0];
  tempDHT = v[1];
  humedad = v[2];
  ventilador = (v[3] > 0.5);
  errorSensor = (v[4] > 0.5);
  hayDatos = true;
  ultimoDato = millis();
}

void leerSerialArduino() {
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n') {
      procesarLinea(linea);
      linea = "";
    } else if (c != '\r' && linea.length() < 100) {
      linea += c;
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
  Serial.print(F("Abre en el navegador: http://"));
  Serial.println(WiFi.localIP());

  servidor.on("/", []() { servidor.send_P(200, "text/html", PAGINA); });
  servidor.on("/datos", enviarDatos);
  servidor.begin();
}

void loop() {
  servidor.handleClient();
  leerSerialArduino();
}
