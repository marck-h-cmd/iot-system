# 01. ARQUITECTURA FÍSICA Y LÓGICA — SMART COOLING IoT

## 1. Visión General de la Integración
El sistema **SMART COOLING IoT** integra el circuito físico real compuesto por un microcontrolador **Arduino Nano** y un módulo **ESP32 Gateway** con la plataforma unificada de software (**FastAPI + MySQL + Next.js Web + React Native / Expo APK**), preservando de forma íntegra las capacidades del simulador de 5 zonas, los indicadores metodológicos y las pruebas estadísticas inferenciales.

```
[Sensores Físicos: DHT11 (D2) + DS18B20 (D3)]
                     │
                     ▼
           [Arduino Nano (5V)] ──► [Actuadores: MOSFET Fan (D4) + Servo SG90 (D5)]
                     │
     UART Serial 9600 baudios (TX D1 -> Divisor 1kΩ/2kΩ -> GPIO16 RX)
                     │
                     ▼
        [ESP32 Gateway Wi-Fi (3.3V)]
        GET http://192.168.0.152/datos
                     │
          Polling HTTP (cada 2.0 s)
                     │
                     ▼
        [FastAPI Backend Central (:8000)] ◄───► [Simulador MQTT 5 Zonas + EMQX]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 [MySQL 8.0 (:3308)]    [Clientes Unificados]
 (origen='real'/'virtual')  ├── Dashboard Web Next.js (:3000)
                            └── App Móvil React Native / APK
```

---

## 2. Inventario y Pinout del Hardware Real

| Componente Físico | Pin en Arduino Nano | Pin en ESP32 | Notas Eléctricas |
|---|---|---|---|
| **Sensor DHT11 (DATA)** | Digital `D2` | — | Alimentación 5 V y GND común |
| **Sonda DS18B20 (DATA)** | Digital `D3` | — | Resistencia Pull-up de `10 kΩ` entre DATA y 5 V |
| **Módulo MOSFET Ventilador** | Digital `D4` (TRIG/PWM) | — | Fuente externa de 5 V con **GND común** al Arduino Nano |
| **Servomotor SG90** | Digital `D5` (SIGNAL) | — | Barrido 45°–135° cuando Fan ON; 90° en espera |
| **Enlace UART TX → RX** | `TX1 (D1)` (5 V) | `GPIO16 (RX2)` (3.3 V) | Adaptación de nivel mediante divisor resistivo (`1 kΩ` serie, `2 kΩ` a GND) |
| **Enlace UART RX ← TX** | `RX0 (D0)` | `GPIO17 (TX2)` | Actualmente **no cableado** en Fase 1 (documentado para Fase 3) |

---

## 3. Reglas de Control Autónomo Local en el Arduino Nano
El firmware actual del Arduino Nano ejecuta un lazo de seguridad térmica local e ininterrumpido:
1. **Encendido por temperatura:** Si el sensor DS18B20 registra `temp >= 30.0 °C`, activa el MOSFET del ventilador (`D4 = HIGH`).
2. **Apagado por histéresis:** Si la temperatura desciende a `temp <= 29.0 °C`, apaga el ventilador (`D4 = LOW`).
3. **Banda de retención (Histéresis):** Entre `29.0 °C < temp < 30.0 °C`, conserva el estado previo para evitar oscilaciones rápidas (chattering).
4. **Seguridad ante fallo de sonda (Fail-Safe):** Si el DS18B20 se desconecta o devuelve `-127.0 °C` (`DEVICE_DISCONNECTED_C`), el Arduino activa `error = 1` y **enciende el ventilador automáticamente por seguridad**.
5. **Movimiento del servomotor SG90:** Mientras el ventilador está encendido, barre continuamente entre `45°` y `135°`; cuando el ventilador se apaga, retorna a la posición central de `90°`.

---

## 4. Principio de Intermediación Obligatoria
Ni el navegador web ni la aplicación móvil APK consultan directamente la IP privada del ESP32 (`192.168.0.152`). Toda adquisición se realiza exclusivamente a través del servicio central `ESP32ClientService` en **FastAPI**, evitando problemas de aislamiento de clientes Wi-Fi, bloqueos CORS y saturación del stack TCP del microcontrolador ESP32.
