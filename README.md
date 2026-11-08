# Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)

**Laboratorio de Cómputo • Universidad Nacional de Trujillo**  
**Arquitectura:** Edge Computing + Microservicios Docker + Machine Learning (Scikit-Learn) + Next.js + React Native Mobile Client

---

## 📌 1. Visión General y Alcance
Este sistema monitorea en tiempo real la temperatura del aire expulsado por equipos de cómputo en un laboratorio universitario, dirigiendo dinámicamente un recurso de ventilación compartido (un flujo de aire direccionable mediante un servomotor y activado por un driver MOSFET) hacia la zona con mayor estrés térmico, optimizando el consumo energético y garantizando la disipación térmica sin necesidad de instalar ventiladores individuales continuos.

El proyecto integra:
- **Zonas Físicas Reales:** 
  - **PC 1 (Zona 1):** Sensor de temperatura y humedad **DHT11** conectado a pin digital D2 del Arduino Nano.
  - **PC 2 (Zona 2):** Sensor sumergible/metálico de alta precisión **DS18B20** con protocolo 1-Wire en pin digital D3 con resistencia pull-up de 4.7kΩ.
- **Zonas Virtuales Simuladas:**
  - **PC 3 (Zona 3), PC 4 (Zona 4), PC 5 (Zona 5):** Nodos simulados en Python inyectando telemetría con deriva térmica ascendente y ruido estocástico hacia el Broker MQTT cada 5 segundos.
- **Actuadores Físicos Compartidos:**
  - **Servomotor SG90:** Orientación angular (0°, 45°, 90°, 135°, 180°) mediante PWM desde pin D9 del Arduino Nano.
  - **Miniventilador axial 5V:** Conmutación de alta velocidad mediante módulo driver MOSFET AOD4184A desde pin D5 del Arduino Nano.
- **Clientes de Monitoreo:**
  - **Web Dashboard (Next.js 14):** Interfaz web industrial con Sidebar modular, radar de orientación, curvas térmicas y análisis inferencial (t-Student, ANOVA).
  - **Cliente Móvil (React Native / Expo):** Aplicación móvil MQTT nativa para smartphones con telemetría en vivo, matriz térmica, control manual remoto y configuración segura de sesión.

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
  |    Sensor DS18B20 (1-Wire + 4.7k) |
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
    |               EMQX (Puertos 1883 TCP / 8083 WS)           |
    +-------------+-----------------------------+---------------+
                  |                             |
                  v                             v
    +---------------------------+ +-----------------------------+
    |   BACKEND FASTAPI & IA    | | CLIENTE MÓVIL (REACT NATIVE)|
    | (Control autónomo + MySQL)| | (App Expo para Smartphone)  |
    +---------------------------+ +-----------------------------+
```

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

## 🗂️ 4. Estructura del Proyecto

```
mqqt/
├── firmware/
│   ├── arduino_nano/
│   │   └── arduino_nano.ino          <- Firmware C++ Edge (DHT11, DS18B20, MOSFET, Servo, ACK)
│   └── esp32_gateway/
│       └── esp32_gateway.ino         <- Firmware C++ Gateway (Wi-Fi, MQTT PubSubClient, UART Bridge)
├── database/
│   ├── init.sql                      <- Esquema MySQL (registro_termico, control_eventos, mqtt_user, mqtt_acl)
│   └── emqx_auth_mysql.conf          <- Configuración plugin MySQL de autenticación EMQX
├── backend/                          <- Backend FastAPI + Regresión Lineal scikit-learn + Pruebas SciPy
│   ├── app/
│   │   ├── config.py                 <- Variables y umbrales térmicos
│   │   ├── database.py               <- Capa MySQL y consultas de desfase 10 min
│   │   ├── ml_model.py               <- LinearRegression y cálculo matemático de MAE, RMSE, R²
│   │   ├── mqtt_service.py           <- Suscriptor MQTT, lazo autónomo de 35°C y cálculo de latencia
│   │   ├── statistics_service.py     <- Batería inferencial (t-Student pareada, 1 muestra, ANOVA, Shapiro-Wilk)
│   │   └── main.py                   <- Endpoints REST
│   ├── requirements.txt
│   └── Dockerfile
├── simulador/                        <- Simulador de Zonas Virtuales (PC 3, PC 4, PC 5)
│   ├── simulador.py                  <- Inyector con deriva ascendente y respuesta térmica a ventilación
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                         <- Web Dashboard Next.js 14
│   ├── app/
│   │   ├── globals.css               <- Tema oscuro y glassmorphism
│   │   ├── layout.tsx                <- Metadata y configuración base
│   │   └── page.tsx                  <- Dashboard con Sidebar, Recharts, KPIs, Indicadores y Estadísticas
│   ├── package.json
│   └── tailwind.config.js
├── mobile/                           <- Cliente Móvil React Native (Expo) [Laboratorio 11]
│   ├── App.tsx                       <- Interfaz móvil principal (KPIs, Matriz térmica, Control manual)
│   ├── src/
│   │   ├── components/               <- ZoneCard, HeroMetrics, ControlPanel, ConnectionModal
│   │   ├── services/mqttClient.ts    <- Cliente MQTT WebSocket nativo con auto-reconexión
│   │   ├── styles/theme.ts           <- Paleta de colores dark industrial y metadatos
│   │   └── types/iot.ts              <- Tipos TypeScript para telemetría, acciones y ACK
│   ├── package.json
│   └── tsconfig.json
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

## 🚀 5. Puesta en Marcha

### 1. Iniciar la Infraestructura Docker (Broker, BD, Backend, Web)
```bash
docker compose up -d --build
```
Servicios disponibles:
* **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
* **API FastAPI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **EMQX Console:** [http://localhost:18083](http://localhost:18083) (`admin` / `public`)
* **phpMyAdmin:** [http://localhost:8085](http://localhost:8085)

### 2. Iniciar el Cliente Móvil (React Native)
Abre una terminal en la carpeta `mobile/`:
```bash
cd mobile
npm start
```
* **En tu Smartphone:** Abre la aplicación **Expo Go** (Android / iOS) y escanea el código QR que aparece en la terminal.
* **En el Navegador Web:** Presiona la tecla `w` en la terminal para abrir la versión móvil en Chrome/Edge.
* **Configuración del Broker:** Pulsa el botón de configuración (ícono de engranaje) en la esquina superior derecha para ajustar la IP del bróker según tu entorno (por defecto `192.168.1.5:8083` o `10.0.2.2:8083` en emulador Android).

---

## 🧪 6. Ejecución de Pruebas
```cmd
python tests/test_sistema_completo.py
python tests/test_api_y_mqtt_e2e.py
```
O simplemente ejecuta:
```cmd
ejecutar_pruebas.bat
```
