# 08. PRUEBAS FUNCIONALES, ESTADÍSTICAS Y END-TO-END REALIZADAS

**Proyecto:** SMART COOLING IoT 2.0 — Universidad Nacional de Trujillo

---

## 1. Resumen de Ejecución de la Suite Automatizada

Se ejecutaron las suites de pruebas automatizadas dentro del entorno de contenedores activos (`iot-system-backend-1`, `iot-system-mysql-1`, `iot-system-emqx-1`, `iot-system-simulador-1`):

### A. `tests/test_sistema_completo.py` (6/6 Pruebas Exitosas)
- **`test_01_conexion_mysql_y_tablas`**: Conexión verificada a MySQL 8.0 y existencia de `registro_termico`, `control_eventos` y `mqtt_user`.
- **`test_02_insercion_telemetria_y_consulta`**: Inserción y lectura de registros térmicos de las 5 zonas.
- **`test_03_modelo_machine_learning_regresion_lineal`**: Proyección a `+10 min` con Scikit-Learn y factor de amortiguamiento.
- **`test_04_calculo_matematico_metricas_ml`**: Exactitud matemática de `MAE`, `RMSE` y `R²`.
- **`test_05_evento_control_y_latencia_ack`**: Registro de comando y actualización de latencia al recibir confirmación `ACK`.
- **`test_06_resumen_indicadores_4_dimensiones`**: Consolidación de las 4 dimensiones metodológicas.

### B. `tests/test_api_y_mqtt_e2e.py` (7/7 Pruebas End-to-End Exitosas)
- **`test_01_endpoint_health`**: Salud de base de datos, broker MQTT y modo `simulacion`.
- **`test_02_endpoint_telemetria_actual`**: Retorno simultáneo de las 5 estaciones (`PC 1` a `PC 5`).
- **`test_03_endpoint_metricas_ml`**: Cálculo de métricas predictivas sobre la base de datos.
- **`test_04_endpoint_indicadores_4_dimensiones`**: Verificación del endpoint `/api/indicadores`.
- **`test_05_endpoint_control_manual`**: Emisión de comando manual hacia `zona4` (`135°`, `fan_state=1`).
- **`test_06_flujo_completo_mqtt_trigger_y_ack`**: Publicación de temperatura crítica (`36.5°C`), disparo automático de orden MQTT, recepción de `ACK` correlacionado y persistencia de latencia en MySQL.
- **`test_07_endpoints_simulacion_y_modo_v2`**: Validación de `POST /api/control/modo`, `POST /api/simulacion/escenario`, `GET /api/telemetria/zona/zona1` y `GET /api/alertas`.

### C. Verificación de Compilación Estática (Frontend & Mobile)
- **Next.js 14 (`frontend/`)**: `npm run build` completado con 0 errores de TypeScript ni ESLint.
- **React Native / Expo (`mobile/`)**: `npx tsc --noEmit` completado con código de salida `0` (0 errores de tipos).

