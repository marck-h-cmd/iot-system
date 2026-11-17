# 07. INVENTARIO Y GUÍA DE FIRMWARE (ARDUINO NANO Y ESP32)

## 1. Estructura de Directorios de Firmware en el Repositorio

```text
firmware/
├── hardware_original/                        # Fase 1: Código exacto en operación actual (Unidireccional)
│   ├── arduino_nano/
│   │   └── arduino_nano_original.ino         # DHT11 (D2), DS18B20 (D3), MOSFET (D4), Servo (D5), UART TX (9600)
│   └── esp32_gateway/
│       └── esp32_gateway_original.ino        # UART2 RX (GPIO16), WebServer HTTP GET / y GET /datos
├── bidireccional_propuesto/                  # Fase 3: Código listo para control remoto + protección térmica
│   ├── arduino_nano_bidireccional/
│   │   └── arduino_nano_bidireccional.ino    # Escucha CMD por RX (D0), responde ACK y aplica Override >= 30°C
│   └── esp32_gateway_bidireccional/
│       └── esp32_gateway_bidireccional.ino   # Añade POST /control, mide latencia RTT UART y amplía /datos
├── arduino_nano/
│   └── arduino_nano.ino                      # Copia sincronizada de producción
└── esp32_gateway/
    └── esp32_gateway.ino                     # Copia sincronizada de producción
```

---

## 2. Librerías Requeridas en Arduino IDE

### Para Arduino Nano (`ATmega328P`):
* `OneWire` (por Paul Stoffregen)
* `DallasTemperature` (por Miles Burton)
* `DHT sensor library` (por Adafruit) + `Adafruit Unified Sensor`
* `Servo` (integrada en Arduino IDE)

### Para ESP32 (`ESP32 Dev Module`):
* Core oficial `esp32` por Espressif Systems (`WiFi.h`, `WebServer.h`, `HardwareSerial`)

---

## 3. Configuración Segura de Credenciales Wi-Fi
En los archivos `.ino` del ESP32, las credenciales están parametrizadas como marcadores locales:
```cpp
const char* ssid = "CONFIGURAR_SSID_LOCAL";
const char* password = "CONFIGURAR_PASSWORD_LOCAL";
```
**Nunca subas contraseñas reales de tu red doméstica al repositorio público de GitHub.** Coloca tu SSID y clave únicamente en el IDE de Arduino al momento de compilar y flashear la placa ESP32.
