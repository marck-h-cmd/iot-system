# 04. CONFIGURACIÓN DE FASTAPI Y PERSISTENCIA EN MYSQL

## 1. Variables de Entorno (`backend/app/config.py`)
El backend soporta configuración dinámica mediante variables de entorno o valores por defecto seguros:

| Variable de Entorno | Valor por Defecto | Descripción |
|---|---|---|
| `OPERATION_MODE` | `simulacion` | Modo inicial: `simulacion`, `real` o `hibrido` |
| `ESP32_HOST` | `192.168.0.152` | Dirección IP local del ESP32 Gateway |
| `ESP32_PORT` | `80` | Puerto HTTP del servidor WebServer del ESP32 |
| `ESP32_URL` | `http://192.168.0.152/datos` | Endpoint completo de adquisición JSON |
| `ESP32_POLL_INTERVAL_S` | `2.0` | Intervalo del hilo de sondeo en segundos |
| `ESP32_TIMEOUT_S` | `2.5` | Timeout máximo por petición HTTP |
| `HW_MAPPING_DHT11` | `zona1` | Estación asociada al sensor físico DHT11 (PC 1 por defecto) |
| `HW_MAPPING_DS18B20` | `zona2` | Estación asociada a la sonda física DS18B20 (PC 2 por defecto) |

---

## 2. Nuevos Endpoints REST para Hardware Real (`backend/app/main.py`)

### 2.1. Cambiar Modo de Operación del Sistema
* **Endpoint:** `POST /api/sistema/modo-operacion`
* **Cuerpo JSON:**
  ```json
  {
    "modo": "hibrido"
  }
  ```
  Valores permitidos: `"simulacion"`, `"real"`, `"hibrido"`.

### 2.2. Consultar Estado Diagnóstico del Enlace ESP32
* **Endpoint:** `GET /api/hardware/estado`
* **Respuesta:** Incluye `conectado`, `estado_enlace` (`CONECTADO`, `DESCONECTADO`, `TELEMETRIA_ANTIGUA`, `ERROR_SENSOR`), `latencia_ms`, `edad_trama_s`, contadores de éxito/fallo, mapeo de sensores y `datos_actuales`.

### 2.3. Consultar Lecturas Crudas y Zonas Físicas
* **Endpoint:** `GET /api/hardware/datos`
* **Respuesta:** Devuelve la última trama JSON recibida de `/datos` y las zonas físicas enriquecidas con predicción Scikit-Learn a +10 minutos.

### 2.4. Actualizar IP del ESP32 o Mapeo de Sensores en Caliente
* **Endpoint:** `POST /api/hardware/configuracion`
* **Cuerpo JSON:**
  ```json
  {
    "esp32_url": "http://192.168.0.152/datos",
    "poll_interval_s": 2.0,
    "mapping_dht11": "zona1",
    "mapping_ds18b20": "zona2"
  }
  ```

---

## 3. Persistencia Diferenciada en MySQL
En la tabla `registro_termico`, cada lectura adquirida desde el ESP32 se almacena con la columna `origen = 'real'`, mientras que los datos generados por el simulador se guardan con `origen = 'virtual'`. El servicio controla la frecuencia de inserción (máximo 1 lote cada 3 segundos y solo cuando `estado_enlace == 'CONECTADO'`) para evitar registros duplicados o lecturas obsoletas en la base de datos.
