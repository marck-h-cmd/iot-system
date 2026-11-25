# SMART COOLING IoT 2.0 — Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos

**Universidad Nacional de Trujillo (UNT) — Escuela Profesional de Ingeniería de Sistemas**  
**Versión:** `2.0.0`

---

## 1. Descripción General

En modo híbrido el dashboard muestra dos estaciones físicas y tres simuladas. **PC 1** usa el DHT11 y **PC 2** usa el DS18B20. El Arduino Nano controla el ventilador y el servomotor. El ESP32 publica los datos del Nano por Wi-Fi en `/datos`. El simulador Python publica telemetría de **PC 3 a PC 5** por MQTT mediante EMQX.

FastAPI proyecta la temperatura a **10 minutos** mediante regresión lineal de Scikit-learn. Cada sensor y cada fuente usan su propio historial. En simulación el backend activa el ventilador si la temperatura actual o pronosticada alcanza 35 °C y dirige el servo hacia la zona prioritaria. El apagado automático se produce cuando han desaparecido las condiciones de alerta y todas las zonas simuladas con señal bajan de 32 °C. El montaje físico se gobierna con las lecturas locales del Nano.

---

## 2. Inicio Rápido

### A. Iniciar el dashboard en modo híbrido

En `.env`, configura `OPERATION_MODE=hibrido` y `ESP32_URL=http://IP_DEL_ESP32/datos`. El monitor serie del ESP32 muestra su IP a 115200 baudios. El dashboard también permite seleccionar simulación completa o solo hardware físico.

```powershell
docker compose up -d --build
```

- [Dashboard](http://localhost:3000)
- [API y documentación Swagger](http://localhost:8000/docs)
- [Consola EMQX](http://localhost:18083)
- [phpMyAdmin](http://localhost:8085)

Carga `firmware/arduino_nano/arduino_nano.ino` seleccionando Arduino Nano. Cada zona pide aire a partir de 30 °C y deja de pedirlo al llegar a 29 °C. Si ambas lo necesitan, el Nano alterna el flujo entre ellas cada 20 segundos. Los ángulos iniciales son 45° para el DS18B20 y 135° para el DHT11. Comprueba visualmente el flujo en ambos extremos y ajusta las constantes del sketch según el montaje de la paleta.

El ESP32 actual publica temperaturas, humedad y estado del ventilador. El sketch en `firmware/esp32_gateway/esp32_gateway.ino` permite que el propio ESP32 también incluya la dirección de la paleta en `/datos`.

En **Control → Control físico del Nano** se puede encender el ventilador, orientar la paleta entre 45° y 135° o pausar ambos actuadores por 30 segundos. El Nano confirma cada orden por USB. En pausa, D4 apaga el MOSFET y D5 deja de emitir pulsos al servo, que sigue conectado al riel de 5 V. El Nano vuelve a automático al vencer la orden o si falla un sensor.

Con `NANO_PORT` y `NANO_BRIDGE_TOKEN` configurados en `.env`, el script `iniciar_sistema.bat` inicia el puente USB en segundo plano. También puedes lanzarlo con `pwsh -File .\puente_nano.ps1 -EnSegundoPlano`. La API y el dashboard se publican en la interfaz local de la PC.

Para probar el enfriamiento, calienta moderadamente cada zona por separado y retira la fuente de calor. Comprueba hacia dónde dirige el aire la paleta y compara las curvas del dashboard.

En **Indicadores** se consulta MAE, RMSE y R² por fuente. **Estadísticas** muestra las pruebas exploratorias sobre MQTT y el resumen histórico de los tres CSV que acompaña al artículo.

### B. Iniciar la Aplicación Móvil (React Native / Expo)

```powershell
cd mobile
npm install
npx expo start
```

- Presiona **`w`** para abrir en navegador web (`http://localhost:8081`), o escanea el código QR con **Expo Go** en tu teléfono conectado a la misma red Wi-Fi (`http://192.168.0.23:8000`).

---

## 3. Documentación Completa de la Versión 2.0

Consulta la carpeta [`DOCUMENTACION_VERSION_2/`](./DOCUMENTACION_VERSION_2/) para el detalle técnico completo:

1. [`01_CAMBIOS_REALIZADOS.md`](./DOCUMENTACION_VERSION_2/01_CAMBIOS_REALIZADOS.md)
2. [`02_ARQUITECTURA_MODO_SIMULACION.md`](./DOCUMENTACION_VERSION_2/02_ARQUITECTURA_MODO_SIMULACION.md)
3. [`03_DISENO_UI_UX_Y_SISTEMA_VISUAL.md`](./DOCUMENTACION_VERSION_2/03_DISENO_UI_UX_Y_SISTEMA_VISUAL.md)
4. [`04_MANUAL_DASHBOARD_WEB.md`](./DOCUMENTACION_VERSION_2/04_MANUAL_DASHBOARD_WEB.md)
5. [`05_MANUAL_APP_MOVIL.md`](./DOCUMENTACION_VERSION_2/05_MANUAL_APP_MOVIL.md)
6. [`06_GUIA_SIMULADOR_Y_ESCENARIOS.md`](./DOCUMENTACION_VERSION_2/06_GUIA_SIMULADOR_Y_ESCENARIOS.md)
7. [`07_GUIA_INSTALACION_Y_EJECUCION.md`](./DOCUMENTACION_VERSION_2/07_GUIA_INSTALACION_Y_EJECUCION.md)
8. [`08_PRUEBAS_REALIZADAS.md`](./DOCUMENTACION_VERSION_2/08_PRUEBAS_REALIZADAS.md)
9. [`09_PENDIENTES_HARDWARE_REAL.md`](./DOCUMENTACION_VERSION_2/09_PENDIENTES_HARDWARE_REAL.md)
