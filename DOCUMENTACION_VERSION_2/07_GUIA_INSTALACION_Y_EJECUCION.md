# 07. GUÍA DE INSTALACIÓN Y EJECUCIÓN PASO A PASO

**Proyecto:** SMART COOLING IoT 2.0 — Universidad Nacional de Trujillo

---

## 1. Requisitos Previos

- **Docker Desktop** instalado y en ejecución (para levantar EMQX, MySQL 8.0, FastAPI, Simulador Python, Next.js Frontend y phpMyAdmin).
- **Node.js 18+ / 20+** (para ejecutar la aplicación móvil React Native / Expo).

---

## 2. Levantar la Plataforma Completa con Docker

Desde la raíz del proyecto (`iot-system/`):

```powershell
docker compose up -d --build
```

O ejecutando directamente el script automatizado en Windows:

```powershell
.\iniciar_sistema.bat
```

### Servicios y Puertos Disponibles

| Servicio | URL / Puerto | Credenciales (si aplica) |
| :--- | :--- | :--- |
| **Dashboard Web Next.js 2.0** | `http://localhost:3000` | Acceso directo |
| **API Backend FastAPI + Swagger** | `http://localhost:8000/docs` | Acceso directo |
| **Consola EMQX Broker** | `http://localhost:18083` | Usuario: `admin` / Clave: `public` |
| **phpMyAdmin (Base de Datos)** | `http://localhost:8080` | Servidor: `mysql` / Usuario: `iot_user` / Clave: `iot_password_2025` |
| **Broker MQTT TCP / WebSocket** | `localhost:1883` / `localhost:8083` | Usuario: `sensor_iot` / Clave: `marck124M` |

---

## 3. Iniciar la Aplicación Móvil (React Native / Expo)

Abre una terminal en la carpeta `mobile/`:

```powershell
cd mobile
npm install
npx expo start
```

### Formas de abrir la App Móvil:
1. **En el Navegador Web (`Expo Web`):** Presiona la tecla **`w`** en la terminal de Expo o abre `http://localhost:8081`. La app detectará automáticamente `http://localhost:8000`.
2. **En tu Teléfono Físico (`Expo Go`):**
   - Asegúrate de que tu teléfono y tu PC estén en la misma red Wi-Fi.
   - Escanea el código QR con **Expo Go** (Android) o la Cámara (iOS).
   - La app detectará automáticamente la IP LAN de tu PC (`http://192.168.0.23:8000`), o puedes ajustarla en el ícono de **Configuración (⚙️)** arriba a la derecha.
3. **En Emulador Android Studio:** Presiona **`a`** en la terminal de Expo (o selecciona el preset `http://10.0.2.2:8000` en la pantalla Configuración).

