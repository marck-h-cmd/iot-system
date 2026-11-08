# Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)

**Laboratorio de Cómputo • Universidad Nacional de Trujillo**  
**Arquitectura:** Edge Computing + Microservicios Docker + Machine Learning (Scikit-Learn) + Next.js

---

## 📌 1. Visión General y Alcance
Este sistema monitorea en tiempo real la temperatura del aire expulsado por equipos de cómputo en un laboratorio universitario, dirigiendo dinámicamente un recurso de ventilación compartido (un flujo de aire direccionable mediante un servomotor y activado por un driver MOSFET) hacia la zona con mayor estrés térmico, optimizando el consumo energético y garantizando la disipación térmica sin necesidad de instalar ventiladores individuales continuos.

El proyecto integra:
- **Zonas Físicas Reales:** 
  - **PC 1 (Zona 1):** Sensor de temperatura y humedad **DHT11** conectado a pin digital D2 del Arduino Nano.
  - **PC 2 (Zona 2):** Sensor sumergible/metálico de alta precisión **DS18B20** con protocolo 1-Wire en pin digital D3 con resistencia pull-up de 10kΩ.
- **Zonas Virtuales Simuladas:**
  - **PC 3 (Zona 3), PC 4 (Zona 4), PC 5 (Zona 5):** Nodos simulados en Python inyectando telemetría con deriva térmica ascendente y ruido estocástico hacia el Broker MQTT cada 5 segundos.
- **Actuadores Físicos Compartidos:**
  - **Servomotor SG90:** Orientación angular (0°, 45°, 90°, 135°, 180°) mediante PWM desde pin D9 del Arduino Nano.
  - **Miniventilador axial 5V:** Conmutación de alta velocidad mediante módulo driver MOSFET AOD4184A desde pin D5 del Arduino Nano.

---

## 🏗️ 2. Arquitectura de Hardware y Conexiones Eléctricas

```
  +-----------------------------------+
  |           PC 1 (Zona 1)           |
  |         Sensor DHT11 (5V)         |
  +-----------------+-----------------+
                    | Pin D2
  +-----------------+-----------------+
  |           PC 2 (Zona 2)           |
  |    Sensor DS18B20 (1-Wire + 10k)  |
  +-----------------+-----------------+
                    | Pin D3
                    v
    +-------------------------------+
    |      ARDUINO NANO (5V)        |
    |   - Controlador Edge Físico   |
    |   - Pin D5: Driver MOSFET     | ----> [Miniventilador Axial 5V]
    |   - Pin D9: Servomotor PWM    | ----> [Servomotor SG90 (0°-180°)]
    +---------------+---------------+
                    | UART TX (5V) -> [Divisor Resistivo 1kΩ / 2kΩ] -> RX2 (GPIO 16)
                    | UART RX (5V) <---------------------------------- TX2 (GPIO 17)
                    v
    +-------------------------------+
    |     ESP32-DEVKITC V4 (3.3V)   |
    |   - Gateway IoT Wi-Fi / MQTT  |
    |   - Cliente MQTT (PubSubClient)|
    +---------------+---------------+
                    | Wi-Fi (WPA2)
                    v
    +-----------------------------------------------------------+
    |                     RED IP / BROKER MQTT                  |
    |                  EMQX v4.4 (Puerto 1883)                  |
    +-----------------------------------------------------------+
```

### Tabla de Pines del Microcontrolador Edge (Arduino Nano)
| Dispositivo / Sensor | Pin Nano | Nivel Lógico | Notas Técnicas |
| :--- | :--- | :--- | :--- |
| **DHT11 (DATA)** | `Pin D2` | 5V Digital | Adquisición de temperatura ambiente en PC 1 |
| **DS18B20 (DQ)** | `Pin D3` | 5V 1-Wire | Requiere resistencia pull-up de 10kΩ a 5V |
| **Driver MOSFET AOD4184A (SIG)** | `Pin D5` | 5V Digital | Compuerta (Gate) para activar ventilador axial |
| **Servomotor SG90 (PWM)** | `Pin D9` | 5V PWM | Orientación del flujo (0°=Zona 1, 90°=Zona 3, 180°=Zona 5) |
| **UART TX hacia ESP32** | `Pin TX (1)` | 5V TTL | Conectar a través de divisor resistivo a RX2 (GPIO 16) |
| **UART RX desde ESP32** | `Pin RX (0)` | 5V TTL | Conectar directamente a TX2 (GPIO 17) del ESP32 |

---

## 📊 3. Operacionalización de Variables e Indicadores

| Dimensión | Indicador | Operacionalización / Cálculo | Meta del Proyecto |
| :--- | :--- | :--- | :--- |
| **1. Transmisión & Red** | 1.1 Intervalo de adquisición | `Δt = t_origen(n) - t_origen(n-1)` | 5.0 segundos exactos |
| **1. Transmisión & Red** | 1.2 Tasa de entrega exitosa | `(Mensajes_MySQL / Mensajes_ESP32) * 100` | > 98.0% |
| **2. Precisión ML (+10m)** | 2.1 Error Absoluto Medio (MAE) | $\text{MAE} = \frac{1}{n} \sum \|T_{\text{real, +10m}} - T_{\text{pred}}\|$ | < 0.80 °C |
| **2. Precisión ML (+10m)** | 2.2 Error Cuadrático Medio (RMSE) | $\text{RMSE} = \sqrt{\frac{1}{n} \sum (T_{\text{real, +10m}} - T_{\text{pred}})^2}$ | < 1.00 °C |
| **2. Precisión ML (+10m)** | 2.3 Coeficiente $R^2$ | $R^2 = 1 - \frac{\sum (y - \hat{y})^2}{\sum (y - \bar{y})^2}$ | > 0.90 |
| **3. Respuesta de Control** | 3.1 Exactitud de selección | Selección de zona con $\max(T_{\text{pred}})$ si $T > 35.0^\circ\text{C}$ | 100% de precisión |
| **3. Respuesta de Control** | 3.2 Latencia de respuesta | `Latencia = t_ACK - t_decision` (UART + MQTT) | < 200 ms |
| **4. Efectividad Térmica** | 4.1 Delta Térmico | `ΔT = T_inicial - T_final` tras enfriamiento | Reducción > 2.5 °C |
| **4. Efectividad Térmica** | 4.2 Fracción de tiempo activo | `(Tiempo_Fan_ON / Tiempo_Total) * 100` | Ahorro energético > 50% |

---

## 🗂️ 4. Estructura de Entregables del Código Fuente

```
mqqt/
├── firmware/
│   ├── arduino_nano/
│   │   └── arduino_nano.ino          <- [FASE 1A] Firmware C++ Edge (DHT11, DS18B20, MOSFET, Servo, ACK)
│   └── esp32_gateway/
│       └── esp32_gateway.ino         <- [FASE 1B] Firmware C++ Gateway (Wi-Fi, MQTT PubSubClient, UART Bridge)
├── database/
│   ├── init.sql                      <- [FASE 2] Esquema MySQL (registro_termico, control_eventos, mqtt_user, mqtt_acl)
│   └── emqx_auth_mysql.conf          <- [FASE 2] Configuración plugin MySQL de autenticación EMQX
├── backend/                          <- [FASE 3] Backend FastAPI + Regresión Lineal scikit-learn
│   ├── app/
│   │   ├── config.py                 <- Variables y umbrales térmicos
│   │   ├── database.py               <- Capa MySQL y consultas de desfase 10 min
│   │   ├── ml_model.py               <- LinearRegression y cálculo matemático de MAE, RMSE, R²
│   │   ├── mqtt_service.py           <- Suscriptor MQTT, lazo autónomo de 35°C y cálculo de latencia
│   │   └── main.py                   <- Endpoints REST (/api/telemetria, /api/metricas, /api/indicadores)
│   ├── requirements.txt
│   └── Dockerfile
├── simulador/                        <- [FASE 4] Simulador de Zonas Virtuales (PC 3, PC 4, PC 5)
│   ├── simulador.py                  <- Inyector con deriva ascendente y respuesta térmica a ventilación
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                         <- [FASE 5] Dashboard React / Next.js
│   ├── app/
│   │   ├── globals.css               <- Tema oscuro y glassmorphism
│   │   ├── layout.tsx                <- Metadata y configuración base
│   │   └── page.tsx                  <- Dashboard con Recharts, KPIs y matriz de 5 zonas
│   ├── package.json
│   └── tailwind.config.js
├── tests/
│   ├── test_sistema_completo.py      <- Suite de pruebas unitarias y de base de datos
│   ├── test_api_y_mqtt_e2e.py        <- Suite de pruebas End-to-End (FastAPI + Broker MQTT)
│   └── simulador_hardware_bridge.py  <- Emulador del puente físico Nano + ESP32
├── docker-compose.yml                <- Orquestación unificada en red iot_network
├── iniciar_sistema.bat               <- Lanzador rápido de 1 clic para Windows
├── ejecutar_pruebas.bat              <- Ejecutor automatizado de pruebas de 1 clic
└── README.md
```

---

## 🚀 5. Puesta en Marcha Rápida (Windows)

### Opción A: Despliegue con 1 Clic (Recomendado)
1. Asegúrate de tener los servicios de MySQL y EMQX activos (Docker o locales).
2. Haz doble clic en el archivo **`iniciar_sistema.bat`** (o ejecútalo desde terminal):
   ```cmd
   iniciar_sistema.bat
   ```
3. Se abrirán automáticamente las 3 ventanas de servicio:
   - **Backend FastAPI:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Simulador MQTT:** Inyectando datos cada 5 segundos
   - **Dashboard Next.js:** [http://localhost:3000](http://localhost:3000)

### Opción B: Despliegue con Docker Compose
```bash
docker compose up -d --build
```

---

## 🧪 6. Ejecución de Pruebas Automatizadas
Para verificar el 100% de los módulos y cálculos matemáticos:
```cmd
python tests/test_sistema_completo.py
python tests/test_api_y_mqtt_e2e.py
```
O simplemente haz doble clic en **`ejecutar_pruebas.bat`**.
