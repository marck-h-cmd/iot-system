# 05. MANUAL DE USUARIO WEB Y APK — MODOS SIMULACIÓN, HÍBRIDO Y REAL

## 1. Los Tres Modos Operacionales del Sistema

### A. Modo Simulación (`simulacion`)
* **Comportamiento:** Las 5 estaciones (`PC 1` a `PC 5`) operan con el simulador térmico multi-zona y sus 5 escenarios (`normal`, `sobrecalentamiento`, `carga_extrema`, `demostracion`, `fallo_sensor`).
* **Etiquetado Visual:** Todas las tarjetas muestran la insignia **`SIMULADA`**.
* **Control:** El ventilador y el servomotor simulados responden en tiempo real a órdenes automáticas (IA) y manuales vía MQTT con confirmación `ACK`.

### B. Modo Híbrido (`hibrido`)
* **Comportamiento:** Combina en un único panel las **2 fuentes térmicas físicas reales** procedentes del ESP32 + Arduino Nano (`PC 1` con DHT11 y `PC 2` con DS18B20 por defecto) junto con las **3 zonas simuladas restantes** (`PC 3`, `PC 4`, `PC 5`).
* **Etiquetado Visual:**
  * `PC 1` y `PC 2` exhiben la insignia verde **`REAL`** e informan temperatura física, humedad relativa (`%`) y edad de trama (`s`).
  * `PC 3`, `PC 4` y `PC 5` exhiben la insignia azul **`SIMULADA`**.
* **Banner de Diagnóstico ESP32:** En la parte superior de la vista de Monitoreo se despliega la barra de estado en vivo del Gateway ESP32 con latencia HTTP, lecturas crudas de DS18B20 y DHT11, y estado físico del ventilador.

### C. Modo Hardware Real (`real`)
* **Comportamiento:** Muestra **exclusivamente mediciones físicas** reportadas por el ESP32.
* **Rigor Científico (Cero Datos Inventados):** Las estaciones `PC 3`, `PC 4` y `PC 5` (que no tienen un sensor físico conectado) se marcan con la insignia **`SIN SENSOR`** (`disponible: false`) y muestran `—` en lugar de inventar temperaturas sintéticas.
* Si el ESP32 se desconecta o la trama tiene `edad > 15s`, `PC 1` y `PC 2` pasan inmediatamente a **`ESP32 Desconectado`** / **`Lectura antigua`**.

---

## 2. Cómo Cambiar de Modo en la Página Web (Next.js)
En la barra superior derecha del Dashboard Web (`http://localhost:3000`), utiliza el selector triple:
* **`Simulación`** | **`Híbrido`** | **`Hardware Real`**

El cambio se sincroniza de inmediato con FastAPI y se refleja tanto en la Web como en la aplicación móvil.

---

## 3. Cómo Cambiar de Modo en la Aplicación Móvil (APK / Expo)
1. Abre la vista de **Configuración** (icono superior derecho).
2. En la sección **"Modo de adquisición (Simulación / Híbrido / Hardware Real ESP32)"**, toca cualquiera de los tres botones:
   * **`Simulación`**
   * **`Híbrido`**
   * **`Real (ESP32)`**
3. Regresa a la pestaña **Monitoreo** para observar las insignias **`REAL`**, **`SIMULADA`** o **`SIN SENSOR`** en cada estación.
