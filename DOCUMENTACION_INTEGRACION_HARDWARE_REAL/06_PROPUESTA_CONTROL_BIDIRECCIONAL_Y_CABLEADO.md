# 06. PROPUESTA DE CONTROL BIDIRECCIONAL Y CABLEADO (FASE 3)

## 1. Limitación del Circuito Físico Actual (Fase 1)
En el circuito físico actual:
* Existe únicamente el cable **`Arduino Nano TX1 (D1) → Divisor resistivo (1 kΩ / 2 kΩ) → ESP32 GPIO16 (RX2)`**.
* El pin **`ESP32 GPIO17 (TX2)`** está libre (sin conectar al pin `RX0 (D0)` del Arduino Nano).
* Por lo tanto, el flujo de datos actual es **100% unidireccional** (Arduino Nano envía telemetría hacia el ESP32, pero el Arduino Nano no puede recibir órdenes externas desde el ESP32).

---

## 2. Modificación Física Necesaria para Habilitar Control Remoto (Fase 3)
Para permitir que la Página Web y la APK gobiernen físicamente el ventilador MOSFET (`D4`) y el ángulo del servomotor SG90 (`D5`) a través de FastAPI y el ESP32, se requiere añadir **un único cable puente (jumper)**:

| Origen (ESP32) | Destino (Arduino Nano) | Nivel Lógico y Compatibilidad |
|---|---|---|
| **`GPIO17 (TX2)`** | **`RX0 (D0)`** | Conexión directa segura (la salida de `3.3 V` del ESP32 supera el umbral `VIH_min = 3.0 V` de entrada lógica alta del ATmega328P a `5 V`) |
| **`GND`** | **`GND`** | Mantener tierra común entre Arduino Nano, ESP32 y fuente de 5 V del ventilador |

> **Nota importante al cargar código por USB al Arduino Nano:**
> Dado que el pin `D0 (RX0)` del Arduino Nano es compartido con el conversor USB-Serial (CH340/FT232), desconecta temporalmente el cable de `D0` mientras subes el sketch desde el IDE de Arduino y vuelve a conectarlo al finalizar la carga.

---

## 3. Protocolo Bidireccional Propuesto y Supremacía de Seguridad Térmica

### 3.1. Comando HTTP (`FastAPI → ESP32`)
`POST http://192.168.0.152/control`
```json
{
  "fan": 1,
  "servo": 55,
  "mode": "manual"
}
```

### 3.2. Trama UART (`ESP32 GPIO17 → Arduino Nano D0`)
```text
CMD,FAN=1,SERVO=55,MODE=MANUAL
```

### 3.3. Confirmación Inmediata (`Arduino Nano D1 → ESP32 GPIO16`)
```text
ACK,FAN=1,SERVO=55,MODE=MANUAL,OVERRIDE=0
```

### 3.4. Supremacía de Seguridad Térmica en Hardware (Fail-Safe Inviolable)
Incluso si el usuario selecciona modo `MANUAL` desde la Web o la APK e intenta apagar el ventilador (`FAN=0`), el firmware propuesto en `firmware/bidireccional_propuesto/arduino_nano_bidireccional/arduino_nano_bidireccional.ino` mantiene la **regla de protección física inviolable**:
* Si `tempDS >= 30.0 °C` o `errorDS == true`, el Arduino Nano **fuerza el encendido del ventilador (`FAN=1`)** y responde con `OVERRIDE=1`.
