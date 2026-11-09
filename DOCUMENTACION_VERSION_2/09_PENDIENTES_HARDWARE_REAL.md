# 09. PENDIENTES PARA INTEGRACIÓN CON HARDWARE REAL (FASE FUTURA)

**Proyecto:** Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)  
**Estado Actual:** Operando al 100% en **Modo Simulación de 5 Zonas**

---

## 1. Componentes Físicos Previstos para la Fase de Hardware

Cuando se disponga físicamente del circuito electrónico en el laboratorio de la Universidad Nacional de Trujillo, se conectarán:

1. **Arduino Nano (ATmega328P):**
   - Pin `D2`: Sensor digital `DHT11` (Zona 1 — `PC 1`).
   - Pin `D3`: Bus 1-Wire para sonda impermeable `DS18B20` con resistencia pull-up de `4.7 kΩ` (Zona 2 — `PC 2`).
   - Pin `D5` (PWM): Gate del módulo `MOSFET IRF520 / IRLZ44N` para conmutar el ventilador DC de 5V.
   - Pin `D9` (PWM): Señal de control del servomotor `TowerPro SG90` (`0°` a `180°`).
2. **ESP32-DEVKITC V4 (Puente Wi-Fi / MQTT):**
   - Comunicación UART con el Arduino Nano (`RX2 GPIO16` / `TX2 GPIO17` a `9600 bps`) mediante divisor resistivo de tensión `5V → 3.3V`.

---

## 2. Pasos para Conmutar de Modo Simulación a Modo Híbrido / Físico

La arquitectura 2.0 ya está preparada para realizar la transición sin reescribir el backend, el frontend ni la app móvil:

1. **Flashear el Firmware Existente:**
   - Cargar `firmware/arduino_nano_iot/arduino_nano_iot.ino` en el Arduino Nano.
   - Configurar el SSID/clave Wi-Fi y la IP del host (`192.168.0.23`) en `firmware/esp32_mqtt_bridge/esp32_mqtt_bridge.ino` y cargarlo en el ESP32.
2. **Cambiar Variables de Entorno en `docker-compose.yml`:**
   - En el servicio `simulador`, cambiar `SIMULATION_MODE: "3_zonas"` (para que el simulador solo emita `zona3`, `zona4` y `zona5`, dejando `zona1` y `zona2` al Arduino Nano + ESP32).
   - En el servicio `backend`, cambiar `OPERATION_MODE: "hardware_real"` (o `"hibrido"`).
3. **Recolección de Datos Experimentales Físicos:**
   - Reiniciar el volumen de MySQL o limpiar la tabla `registro_termico` para ejecutar las corridas experimentales reales y contrastar las 4 pruebas estadísticas con mediciones físicas de laboratorio.

