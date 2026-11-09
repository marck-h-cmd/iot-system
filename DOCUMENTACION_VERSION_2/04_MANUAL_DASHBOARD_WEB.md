# 04. MANUAL DEL DASHBOARD WEB (NEXT.JS 14)

**URL de Acceso Local:** `http://localhost:3000`

---

## 1. Estructura General de la Interfaz

El Dashboard Web cuenta con:
- **Barra Lateral Colapsable:** Permite navegar entre las 4 vistas principales y verificar de un vistazo el modo operativo (`MODO SIMULACIÓN`) y el estado del broker EMQX.
- **Cabecera Superior Permanente:**
  - Insignia visible **`MODO SIMULACIÓN (5 ZONAS)`**.
  - Conmutador rápido **`MODO AUTOMÁTICO IA` / `MODO MANUAL`**.
  - Indicador de telemetría activa con hora de última sincronización.
  - Botón de actualización inmediata y selector de **Tema Oscuro / Claro**.

---

## 2. Las 4 Vistas Principales

### Vista 1: Monitoreo en Vivo (`LiveMonitoringView.tsx`)
1. **Banner de Alertas Activas:** Aparece automáticamente cuando alguna estación supera `35.0°C`, tiene proyección crítica a `+10 min` o presenta fallo de sonda.
2. **Fila de 6 KPIs Industriales:**
   - Temperatura Pico Activa y Media de las 5 PCs.
   - Reducción Térmica Promedio (`ΔT`) y ciclos completados.
   - Estado del Ventilador MOSFET (`ACTIVO` / `STANDBY`) y ahorro energético por Duty-Cycle.
   - Ángulo actual del Servomotor SG90 (`0°..180°`) y estación objetivo.
   - Latencia MQTT-ACK medida en simulación (`ms`).
   - Bondad de ajuste del modelo predictivo Scikit-Learn (`R²` y `MAE`).
3. **Gráfico de Evolución Térmica y Predicción (+10 min):** Serie temporal interactiva por computadora (`PC 1` a `PC 5`) junto con un gráfico de barras comparativo de las 5 estaciones.
4. **Radar Cinemático SG90 Interactivo:** Muestra el haz de aire en tiempo real; al hacer clic sobre cualquier nodo (`PC 1` a `PC 5`), orienta el servomotor hacia esa computadora.
5. **Matriz de 5 Computadoras Monitoreadas:** Tarjetas individuales para `PC 1` a `PC 5`. Al hacer clic en cualquier tarjeta se abre el **Modal de Detalle de Estación (`ZoneDetailModal.tsx`)** con su curva histórica, especificaciones del sensor simulado y botón de enfriamiento directo.

### Vista 2: Indicadores (`IndicatorsView.tsx`)
Presenta las **4 Dimensiones** y los **8 Indicadores (`IND-1.1` a `IND-4.2`)** de la matriz de operacionalización con su valor actual, unidad, meta cuantitativa, número de muestras e interpretación técnica.

### Vista 3: Pruebas Estadísticas (`StatisticsView.tsx`)
Muestra en tiempo real las 4 pruebas inferenciales ejecutadas con `SciPy.stats`:
- `STAT-01`: Prueba *t* de Student para muestras pareadas (Pre vs Post enfriamiento).
- `STAT-02`: Prueba *t* de Student para una muestra (Latencia de control `< 200 ms`).
- `STAT-03`: Análisis de Varianza One-Way ANOVA (`PC 1` a `PC 5`).
- `STAT-04`: Prueba de normalidad de Shapiro-Wilk sobre los residuos del modelo ML.

### Vista 4: Control & Simulador (`ControlDiagnosticsView.tsx`)
- Selector de gobernanza: **Modo Automático IA** vs **Modo Manual**.
- **Laboratorio de Escenarios Térmicos en Vivo:** Permite activar con un clic `Operación Normal`, `Sobrecalentamiento Progresivo`, `Carga Térmica Extrema`, `Demostración Automática` o `Fallo de Sonda`, además del botón **Reiniciar Simulación**.
- **Posicionamiento Angular SG90 y Conmutación MOSFET:** Botones por estación (`0°, 45°, 90°, 135°, 180°`), control deslizante fino (`0°–180°`) y encendido/apagado del ventilador.
- **Bitácora de Comandos y Confirmaciones ACK:** Tabla con ID de comando correlacionado, estación, ángulo, latencia medida y estado (`EJECUTADO_SIMULACION`, `PENDIENTE`, `TIMEOUT`).

