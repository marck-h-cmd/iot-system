# SMART COOLING IoT 2.0 — Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos

**Universidad Nacional de Trujillo (UNT) — Escuela Profesional de Ingeniería de Sistemas**  
**Versión:** `2.0.0` (`MODO SIMULACIÓN UNIFICADO — 5 ZONAS`)

---

## 1. Descripción General

**SMART COOLING IoT 2.0** monitorea las temperaturas de **cinco estaciones de cómputo (`PC 1` a `PC 5`)**, predice incrementos térmicos con **10 minutos de anticipación** mediante Regresión Lineal (`Scikit-Learn`) y controla un sistema de refrigeración compartido compuesto por un **ventilador DC 5V (módulo MOSFET)** y un **servomotor direccional SG90 (`0° a 180°`)**.

> **IMPORTANTE — MODO SIMULACIÓN INTEGRADO:**  
> Esta versión opera **100% sin requerir el circuito electrónico físico conectado**, gracias a un simulador termodinámico unificado en Python (`simulador/simulador.py`) que modela las 5 zonas, los sensores (`DHT11`, `DS18B20` y sondas virtuales), el enfriamiento gradual cuando actúa el ventilador, 5 escenarios térmicos seleccionables en vivo y confirmaciones `ACK` correlacionadas por `comando_id`.

---

## 2. Inicio Rápido

### A. Levantar Backend, Simulador, Broker MQTT, MySQL y Dashboard Web (Docker)

```powershell
docker compose up -d --build
```

O ejecuta el script automatizado en Windows:

```powershell
.\iniciar_sistema.bat
```

- **Dashboard Web Next.js 2.0:** `http://localhost:3000`
- **API Backend FastAPI (Swagger UI):** `http://localhost:8000/docs`
- **Consola EMQX Broker:** `http://localhost:18083` (`admin` / `public`)
- **phpMyAdmin:** `http://localhost:8080` (`iot_user` / `iot_password_2025`)

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
