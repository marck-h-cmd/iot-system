# 02. ARQUITECTURA EN MODO SIMULACIÓN UNIFICADO

**Proyecto:** Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)  
**Versión:** 2.0.0

---

## 1. Diagrama de Flujo Unificado (Sin Circuito Físico)

```mermaid
flowchart LR
    subgraph SIM["Simulador Termodinámico Python (5 Zonas)"]
        Z1["PC 1 (0°) • DHT11 Sim"]
        Z2["PC 2 (45°) • DS18B20 Sim"]
        Z3["PC 3 (90°) • Sonda Virtual"]
        Z4["PC 4 (135°) • Sonda Virtual"]
        Z5["PC 5 (180°) • Sonda Virtual"]
        ACT["Actuadores Virtuales: Fan MOSFET + Servo SG90"]
    end

    subgraph BROKER["Broker MQTT EMQX"]
        T_TEMP["lab/piloto/zona1..5/temp"]
        T_ACC["lab/piloto/accion"]
        T_ACK["lab/piloto/ack"]
        T_SIM["lab/piloto/simulador/control & estado"]
    end

    subgraph BACKEND["FastAPI Backend + Scikit-Learn (Fuente Única de Verdad)"]
        MQTT_SVC["MQTTService + Gobernanza Auto/Manual"]
        ML["LinearRegressionPredictor (+10 min)"]
        STAT["StatisticsService (SciPy.stats)"]
    end

    DB[("MySQL 8.0\nregistro_termico\ncontrol_eventos")]

    WEB["Dashboard Web Next.js 14\n(Puerto 3000)"]
    MOB["App Móvil React Native / Expo\n(Android / iOS / Web)"]

    SIM -->|"Publica cada 5s"| T_TEMP
    T_TEMP --> MQTT_SVC
    MQTT_SVC --> ML
    MQTT_SVC -->|"Persiste telemetría y comandos"| DB
    MQTT_SVC -->|"Orden con comando_id"| T_ACC
    T_ACC --> ACT
    ACT -->|"ACK correlacionado + latencia"| T_ACK
    T_ACK --> MQTT_SVC
    MQTT_SVC <-->|"Cambio de escenario / Reset"| T_SIM
    T_SIM <--> SIM

    WEB <-->|"REST API (/api/*)"| BACKEND
    MOB <-->|"REST API (/api/*)"| BACKEND
```

---

## 2. Principios Arquitectónicos Clave

1. **FastAPI como Fuente Única de Verdad (`Single Source of Truth`):**
   - Tanto el **Dashboard Web (`frontend/`)** como la **Aplicación Móvil (`mobile/`)** consumen los mismos endpoints REST de FastAPI (`http://<host>:8000/api/*`).
   - Esto garantiza que ambas pantallas muestren exactamente las mismas temperaturas, predicciones a +10 minutos, ángulo del servomotor, estado del ventilador, modo de control (`AUTOMÁTICO` / `MANUAL`), escenario activo e indicadores estadísticos.

2. **Trazabilidad y Honestidad Metodológica (`MODO SIMULACIÓN`):**
   - Cada lectura térmica incluye `origen = "virtual"` y `modo_simulacion = True`.
   - Cada comando emitido genera un identificador único `comando_id` (`cmd_<timestamp>_<uuid>`) con estado inicial `PENDIENTE`.
   - Cuando el simulador procesa la orden de orientación del servomotor y encendido del ventilador, devuelve un paquete MQTT en `lab/piloto/ack` con el mismo `comando_id`, actualizando el registro en MySQL a `EJECUTADO_SIMULACION` y registrando la latencia real medida en milisegundos.

3. **Preparación para Hardware Físico Futuro:**
   - La variable de entorno `SIMULATION_MODE` en `simulador/simulador.py` permite conmutar de `"5_zonas"` (fase actual sin circuito) a `"3_zonas"` cuando se conecten el Arduino Nano y el ESP32 reales para `zona1` y `zona2`, sin modificar la base de datos ni las interfaces.

