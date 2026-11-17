# 02. CONTRATO DE DATOS Y TELEMETRÍA FÍSICA

## 1. Trama Serial UART (Arduino Nano → ESP32)
El Arduino Nano transmite cada ~1 segundo por su puerto serial (`9600 baudios, 8N1`) una línea CSV con el siguiente formato estricto:

```text
DATA,tempDS,tempDHT,humedad,ventilador,error
```

### Ejemplo de Trama Serial
```text
DATA,33.70,30.00,71.00,1,0
```
* `tempDS`: Temperatura en °C medida por la sonda DS18B20 (o `-999.0` si hay error de lectura).
* `tempDHT`: Temperatura ambiental en °C medida por el DHT11 (o `-999.0` si `isnan`).
* `humedad`: Humedad relativa (%) medida por el DHT11 (o `-999.0` si `isnan`).
* `ventilador`: `1` (Encendido) o `0` (Apagado).
* `error`: `1` (Error físico en DS18B20) o `0` (Operación normal).

---

## 2. Contrato JSON HTTP del ESP32 (`GET /datos`)
El servidor web del ESP32 expone en el puerto `80` el endpoint `GET http://192.168.0.152/datos`, devolviendo el siguiente objeto JSON:

```json
{
  "temp": 33.7,
  "tdht": 30.0,
  "hum": 71.0,
  "ventilador": true,
  "error": false,
  "edad": 1
}
```

### Semántica y Reglas de Validación en FastAPI (`esp32_client.py`)

| Campo JSON | Tipo | Interpretación Técnica | Tratamiento de Nulos / Errores |
|---|---|---|---|
| `temp` | `float \| null` | Temperatura física DS18B20 (°C) | Si es `null` o `<= -900`, se marca la zona como no disponible (`ERROR_SENSOR`) |
| `tdht` | `float \| null` | Temperatura física DHT11 (°C) | Si es `null` o `<= -900`, no se inserta lectura inválida |
| `hum` | `float \| null` | Humedad física DHT11 (%) | Expuesta en tarjetas de monitoreo web y móvil |
| `ventilador` | `bool` | Estado reportado del ventilador físico | Sincroniza el indicador de estado del ventilador en modo real |
| `error` | `bool` | Error detectado en sonda DS18B20 | Dispara alerta `ERROR_SENSOR` en el dashboard |
| `edad` | `int` | Segundos transcurridos desde la última trama UART recibida por el ESP32 | Si `edad > 15` o `edad < 0`, el estado pasa a `TELEMETRIA_ANTIGUA` |

---

## 3. Estados Cualitativos del Enlace Hardware
El servicio `ESP32ClientService` distingue cuatro estados explícitos para no inducir a error al operador:
1. **`CONECTADO`**: El ESP32 responde HTTP 200, `error == false`, `temp != null` y `0 <= edad <= 15`.
2. **`TELEMETRIA_ANTIGUA`**: El ESP32 responde HTTP 200, pero `edad > 15` segundos (el Arduino Nano dejó de enviar tramas seriales). Las lecturas antiguas **no se presentan como temperaturas actuales**, sino que se preserva `ultima_temperatura_valida` como referencia histórica y la zona se marca `disponible: false`.
3. **`ERROR_SENSOR`**: El ESP32 responde HTTP 200, pero `error == true` o `temp == null`.
4. **`DESCONECTADO`**: Timeout o rechazo de red al consultar `GET /datos`.
