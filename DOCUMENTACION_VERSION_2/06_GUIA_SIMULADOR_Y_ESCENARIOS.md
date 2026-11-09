# 06. GUÍA DEL SIMULADOR TERMODINÁMICO Y ESCENARIOS

**Archivo Principal:** `simulador/simulador.py`  
**Modo por Defecto:** `SIMULATION_MODE = "5_zonas"`

---

## 1. Modelo Físico-Matemático Simulado

El simulador Python modela 5 estaciones de cómputo (`zona1` a `zona5`, equivalentes a `PC 1` a `PC 5`) empleando la **Ley de Enfriamiento/Calentamiento de Newton** con ruido térmico gaussiano de sensor:

$$\frac{dT_i}{dt} = k_{\text{cal}} \cdot (T_{\text{eq}, i} - T_i) - \eta_{\text{fan}}(i) \cdot \Delta T_{\text{conv}} + \epsilon_i(t)$$

Donde:
- $T_{\text{eq}, i}$ depende del **escenario activo** en ese instante.
- $\eta_{\text{fan}}(i) = 1$ cuando el ventilador está encendido (`fan_state = 1`) y el ángulo del servomotor SG90 apunta hacia la estación $i$ (`|servo_angle - angulo_zona| <= 22°`).
- Cuando la estación recibe flujo directo del ventilador, la temperatura desciende progresivamente (`-0.25 °C` a `-0.55 °C` por ciclo de 5 s) hasta estabilizarse, evitando saltos artificiales instantáneos.

---

## 2. Catálogo de los 5 Escenarios Seleccionables en Vivo

Puedes cambiar de escenario en cualquier momento desde el **Dashboard Web (Vista Control)**, desde la **App Móvil (Pestaña Control)** o mediante `POST /api/simulacion/escenario`:

| ID Escenario | Nombre | Comportamiento Térmico Simulado |
| :--- | :--- | :--- |
| `normal` | **Operación Normal** | Las 5 computadoras operan entre `28.0°C` y `33.5°C` con variaciones suaves de carga de oficina. |
| `sobrecalentamiento` | **Sobrecalentamiento Progresivo** | `PC 4 (135°)` y `PC 2 (45°)` elevan su carga térmica superando `35.0°C`, disparando la predicción Scikit-Learn y activando el direccionamiento automático del servomotor y el ventilador. |
| `carga_extrema` | **Carga Térmica Extrema** | Múltiples computadoras superan simultáneamente el umbral crítico (`36°C – 39°C`), permitiendo demostrar la priorización de la zona más crítica y el cálculo de reducción térmica `ΔT`. |
| `demostracion` | **Secuencia de Exposición Guiada** | Escenario rotativo ideal para sustentaciones: genera un pico térmico secuencial entre las 5 estaciones para exhibir el barrido angular del servomotor (`0° → 45° → 90° → 135° → 180°`). |
| `fallo_sensor` | **Fallo de Sonda (`SIN SEÑAL`)** | Simula la desconexión de la sonda en `PC 2` (`zona2`). El simulador suspende los paquetes de esa estación y tanto la Web como la App Móvil muestran **`SIN SEÑAL`** y una alerta de `FALLO_SENSOR`, sin inventar temperaturas. |

---

## 3. Confirmación ACK Correlacionada

Cada vez que FastAPI publica un comando en `lab/piloto/accion` con un `comando_id`, el simulador:
1. Actualiza su estado interno (`ventilador_activo` y `angulo_servo`).
2. Simula el tiempo mecánico de tránsito y procesamiento (`15 ms – 45 ms`).
3. Publica en `lab/piloto/ack` la confirmación con el mismo `comando_id` y `"status": "EJECUTADO_SIMULACION"`.

