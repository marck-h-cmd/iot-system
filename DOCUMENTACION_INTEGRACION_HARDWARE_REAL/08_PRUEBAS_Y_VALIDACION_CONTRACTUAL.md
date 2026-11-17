# 08. PRUEBAS AUTOMATIZADAS Y VALIDACIÓN CONTRACTUAL

## 1. Metodología de Validación Contractual (`MockESP32Server`)
Cuando el módulo físico ESP32 no está encendido o accesible desde la subred actual, el sistema incluye un servidor HTTP Mock contractual (`tests/mock_esp32_server.py`) y una suite de pruebas automatizadas (`tests/test_integracion_hardware_real.py`) que reproducen byte a byte el contrato JSON real de `GET /datos`.

---

## 2. Ejecución de las Pruebas Automatizadas
Desde la raíz del proyecto, ejecuta:

```powershell
python tests/test_integracion_hardware_real.py
```

### Casos de Prueba Verificados (5/5 OK)

| ID Prueba | Caso Evaluado | Resultado Obtenido |
|---|---|---|
| `test_01_adquisicion_contrato_normal_conectado` | Adquisición de `{"temp": 33.7, "tdht": 30.0, "hum": 71.0, "ventilador": true, "error": false, "edad": 1}` y persistencia con `origen='real'` | **OK (`CONECTADO`)** |
| `test_02_deteccion_telemetria_antigua` | Trama con `edad: 28` (> 15 s); verifica que no se muestre como lectura actual y conserve `ultima_temperatura_valida` | **OK (`TELEMETRIA_ANTIGUA`)** |
| `test_03_deteccion_error_sensor_ds18b20` | Trama con `error: true` y `temp: null`; verifica que `zona2` reporte `ERROR_SENSOR` mientras `zona1` (DHT11) continúa activa | **OK (`ERROR_SENSOR`)** |
| `test_04_modos_simulacion_real_hibrido` | Alternancia dinámica entre `simulacion` (5 virtuales), `real` (2 físicas + 3 `SIN_SENSOR_FISICO`) e `hibrido` (2 físicas + 3 virtuales) | **OK (100% Coherente)** |
| `test_05_deteccion_esp32_desconectado` | Timeout ante caída del servidor HTTP del ESP32; verifica transición limpia a `DESCONECTADO` sin inventar lecturas | **OK (`DESCONECTADO`)** |

---

## 3. Cómo Levantar el Servidor Mock para Demostración Local sin ESP32 Físico
Si deseas probar los modos **Real** e **Híbrido** en la Web y en la APK mientras el circuito físico está apagado:

1. Inicia el servidor Mock en una terminal:
   ```powershell
   python tests/mock_esp32_server.py
   ```
   *(Quedará escuchando en `http://127.0.0.1:8089/datos` o `http://192.168.0.23:8089/datos`)*
2. Apunta FastAPI hacia el Mock:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/api/hardware/configuracion" -Method Post -ContentType "application/json" -Body '{"esp32_url": "http://192.168.0.23:8089/datos"}'
   ```
3. Para volver a apuntar al ESP32 físico real:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/api/hardware/configuracion" -Method Post -ContentType "application/json" -Body '{"esp32_url": "http://192.168.0.152/datos"}'
   ```
