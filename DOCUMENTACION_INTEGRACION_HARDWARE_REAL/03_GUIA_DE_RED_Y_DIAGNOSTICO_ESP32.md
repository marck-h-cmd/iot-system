# 03. GUÍA DE RED Y DIAGNÓSTICO DE CONECTIVIDAD ESP32 / CELULAR

## 1. Diagnóstico de la Situación Encontrada en Pruebas
Durante la inspección técnica del entorno real se verificaron dos hechos fundamentales:

1. **Por qué el celular mostraba `Offline` / `No se pudo conectar`:**
   En las capturas de pantalla del teléfono móvil se comprobó que el dispositivo tenía activos únicamente los **datos móviles (`VoLTE 4G`)** y tenía el **Wi-Fi apagado**. Las direcciones `192.168.0.23:8000` (PC Host) y `192.168.0.152` (ESP32) pertenecen al bloque privado RFC 1918 (`192.168.0.0/24`), el cual no es enrutable desde la red celular pública 4G de la operadora.
2. **Estado del ESP32 en la LAN (`192.168.0.152`):**
   La computadora host tiene asignada la IP `192.168.0.23` con puerta de enlace `192.168.0.1`. Al ejecutar `Test-NetConnection -ComputerName 192.168.0.152 -Port 80`, cuando el ESP32 se encuentra apagado o en otra subred, el test devuelve `TcpTestSucceeded: False`.

---

## 2. Lista de Verificación Paso a Paso (Comandos en PowerShell)

### Paso 1: Verificar IP actual de la PC que ejecuta FastAPI
```powershell
ipconfig
```
Confirma la dirección IPv4 del adaptador `Wi-Fi` (actualmente `192.168.0.23`).

### Paso 2: Verificar si el ESP32 responde en la red local
```powershell
ping 192.168.0.152
Test-NetConnection -ComputerName 192.168.0.152 -Port 80
curl.exe -i http://192.168.0.152/datos
```
* Si `curl.exe` devuelve el JSON `{"temp":...}`, el enlace entre la PC y el ESP32 está 100% operativo.
* Si el router cambió la IP del ESP32 por DHCP, abre el Monitor Serial del IDE de Arduino a `9600 baudios` al encender el ESP32 para leer la nueva IP impresa en `WiFi.localIP()`, y actualízala en caliente mediante:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8000/api/hardware/configuracion" -Method Post -ContentType "application/json" -Body '{"esp32_url": "http://NUEVA_IP/datos"}'
  ```

### Paso 3: Conectar el Celular (APK / Expo) al Backend FastAPI
1. **Conecta el celular al mismo Wi-Fi** que la PC (`192.168.0.x`).
2. Abre la aplicación móvil → icono de **Configuración (engranaje)**.
3. Selecciona el preset **"Red Wi-Fi LAN (PC Host Actual)"** (`http://192.168.0.23:8000`) y pulsa **"Guardar y probar conexión"**.
4. Si el router tiene activado *AP Isolation* (Aislamiento de clientes Wi-Fi) o deseas usar el celular con **datos móviles 4G fuera de la red local**, selecciona el preset **"Túnel Público (4G / Cualquier Red)"** (`https://quiet-pots-call.loca.lt`).

### Paso 4: Regla de Firewall en Windows (Puerto 8000 y 3000)
Si el celular está en el mismo Wi-Fi pero Windows bloquea las peticiones entrantes al puerto 8000, ejecuta en PowerShell como Administrador:
```powershell
New-NetFirewallRule -DisplayName "SmartCooling FastAPI 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "SmartCooling NextJS 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```
