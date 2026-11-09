# 05. MANUAL DE LA APLICACIÓN MÓVIL (REACT NATIVE / EXPO)

**Ubicación del código:** `mobile/`  
**Tecnologías:** React Native 0.76, Expo 52, TypeScript, `react-native-svg`, `lucide-react-native`

---

## 1. Arquitectura de Conexión Sin Fricción

En la versión 2.0, la aplicación móvil **ya no requiere configurar credenciales WebSocket MQTT ni depende de una IP fija antigua (`192.168.1.5`)**.

- Consume directamente los endpoints REST de **FastAPI (`puerto 8000`)**.
- **Autodetección inteligente de servidor (`mobile/src/services/api.ts`):**
  - Si se abre en navegador web (`Expo Web`), detecta automáticamente `http://localhost:8000`.
  - Si se abre en un teléfono físico mediante **Expo Go**, detecta automáticamente la IP LAN de la computadora anfitriona (`http://192.168.0.23:8000`).
  - Incluye además una pantalla completa de **Configuración** con botones rápidos (`Navegador Web Local`, `Red Wi-Fi LAN`, `Emulador Android 10.0.2.2`) y prueba de conexión en vivo.

---

## 2. Navegación y Pantallas Implementadas (7 Pantallas)

La aplicación cuenta con una barra de navegación inferior (`BottomTabBar.tsx`) con **4 secciones principales** y **3 pantallas secundarias**:

### Secciones Principales (Barra Inferior)
1. **Monitoreo (`HomeMonitoringScreen.tsx`):**
   - Estado de conexión, insignia `MODO SIMULACIÓN`, escenario activo y modo (`AUTO IA` / `MANUAL`).
   - 4 KPIs principales: Temperatura Máxima/Media, Estado del Ventilador, Ángulo del Servomotor SG90 y Latencia ACK.
   - Gráfico vectorial (`ThermalLineChart.tsx`) con curva observada, predicción IA (+10m) y umbral crítico de `35.0°C` seleccionable entre `PC 1` y `PC 5`.
   - Tarjetas de las **5 Computadoras Monitoreadas (`PC 1` a `PC 5`)** con botón rápido `Enfriar` y acceso al detalle individual.
2. **Indicadores (`IndicatorsScreen.tsx`):**
   - Muestra las 4 dimensiones y los 8 indicadores (`IND-1.1` a `IND-4.2`) con su valor, unidad, meta, estado de cumplimiento y número de muestras.
3. **Estadísticas (`StatisticsScreen.tsx`):**
   - Muestra las 4 pruebas de hipótesis (`t-Student pareada`, `t-Student 1 muestra`, `ANOVA`, `Shapiro-Wilk`) con estadístico, `p-valor`, tamaño muestral `n`, estado de suficiencia y conclusión metodológica.
4. **Control (`ControlScreen.tsx`):**
   - Conmutador **Automático IA / Control Manual**.
   - **Radar Cinemático SG90 Nativo (`RadarServoNative.tsx`)** interactivo al tacto.
   - Selector de computadora objetivo (`PC 1` a `PC 5`), ajuste angular fino (`-15°` / `+15°`), encendido/apagado del ventilador y botón de ejecución.
   - **Selector de Escenarios del Simulador** (`Normal`, `Sobrecalentamiento`, `Carga Extrema`, `Demostración`, `Fallo Sonda`) y botón **Reiniciar**.

### Pantallas Secundarias
5. **Detalle de Computadora (`ZoneDetailScreen.tsx`):** Se abre al tocar cualquier tarjeta `PC 1..PC 5`. Muestra sus 4 métricas clave, sensor simulado, curva histórica propia, eventos recientes y control directo de enfriamiento.
6. **Historial de Eventos (`EventsHistoryScreen.tsx`):** Accesible desde el ícono de reloj en la barra superior o desde la vista Control. Lista la bitácora completa de comandos y ACKs.
7. **Configuración (`SettingsScreen.tsx`):** Accesible desde el ícono de engranaje superior. Permite configurar la URL del backend, elegir el intervalo de actualización (`2s`, `3s`, `5s`, `10s`), alternar entre **Modo Oscuro Industrial** y **Modo Claro Laboratorio**, y verificar el diagnóstico de servicios.

