# SMART COOLING 3.0 — REDISEÑO PREMIUM WEB + MÓVIL

**Proyecto:** Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)  
**Institución:** Universidad Nacional de Trujillo (UNT)  
**Dirección de Diseño:** *Minimal Enterprise Dashboard + Modern Industrial IoT* (inspirado en los principios visuales de Shadcn UI Dashboard Blocks, Vercel Geist y Material Design 3).

---

## 1. Sistema de Diseño Unificado (Web & Móvil)

### 1.1 Tokens Semánticos de Color y Contraste WCAG AA
Se eliminaron los textos de bajo contraste sobre fondos claros, los bordes neón, el abuso de mayúsculas y los degradados decorativos innecesarios. Ambos clientes (`frontend/` y `mobile/`) utilizan la misma paleta semántica de alto contraste (cumpliendo estrictamente $\ge 4.5:1$ en texto normal y $\ge 3:1$ en texto grande y elementos gráficos):

| Token Semántico | Modo Claro (Laboratorio / Enterprise) | Modo Oscuro (Industrial IoT) | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Fondo Principal (`bgMain`)** | `#F8FAFC` | `#0B1220` | Lienzo base de la aplicación |
| **Superficie / Tarjeta (`bgCard`)** | `#FFFFFF` | `#111C2E` | Contenedores primarios y paneles |
| **Superficie Elevada (`bgSubCard`)** | `#F1F5F9` | `#19263B` | Sub-bloques, filas activas y controles |
| **Bordes (`borderCard`)** | `#E2E8F0` | `#334155` | Líneas divisorias sutiles de `1px` |
| **Texto Principal (`textPrimary`)** | `#0F172A` | `#F8FAFC` | Títulos, valores numéricos principales |
| **Texto Secundario (`textSecondary`)** | `#475569` | `#CBD5E1` | Subtítulos, etiquetas, unidades y ejes |
| **Acento Primario (`accentPrimary`)** | `#2563EB` | `#38BDF8` | Navegación activa, acciones primarias y serie observada |
| **Cian Técnico (`cyan`)** | `#0891B2` | `#38BDF8` | Serie de predicción IA (+10 min) y telemetría |
| **Éxito / Estable (`emerald`)** | `#15803D` | `#22C55E` | Estado térmico normal, metas cumplidas y ACKs |
| **Advertencia (`amber`)** | `#B45309` | `#F59E0B` | Modo simulación, alertas preventivas y metas fuera de rango |
| **Error / Crítico (`rose`)** | `#DC2626` | `#F87171` | Temperatura $\ge 35.0\text{ °C}$ o fallo de sonda |

### 1.2 Jerarquía Tipográfica y Espaciado
- **Tipografía:** `Inter` y `JetBrains Mono` en Web (`frontend/app/layout.tsx`) y tipografía nativa limpia con pesos `500–800` en React Native (`mobile/`).
- **Capitalización natural:** Se eliminó el uso masivo de `UPPERCASE` en títulos, descripciones y tablas.
- **Identidad de marca simplificada:** Encabezado limpio **Smart Cooling — Control Térmico IoT**. El título académico completo de la tesis universitaria se trasladó a un modal dedicado (**Acerca del proyecto** en Web y sección informativa en **Configuración** Móvil) para evitar repetirlo en cada pantalla.

---

## 2. Corrección Matemática y Revelación Progresiva

### 2.1 Función Centralizada de Evaluación Matemática de Indicadores (`IND-1.1` a `IND-4.2`)
Se resolvió la inconsistencia detectada donde un indicador con MAE elevado (ej. 2.25 °C o 10.165 °C) aparecía erróneamente como «Meta cumplida». Esto ocurría porque anteriormente se evaluaba únicamente si el valor numérico existía (`disponible === true`), sin verificar la condición matemática frente a la meta técnica.

Se implementó una **función centralizada de evaluación matemática** en los tres niveles de la arquitectura:
1. **Backend:** `evaluar_meta_indicador_metodologico` en [`backend/app/statistics_service.py`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/backend/app/statistics_service.py).
2. **Web:** `evaluarMetaIndicador` en [`frontend/services/api.ts`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/services/api.ts).
3. **Móvil:** `evaluarMetaIndicador` en [`mobile/src/services/api.ts`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/services/api.ts).

Cada indicador se evalúa de acuerdo a su meta, operador estricto y suficiencia de muestras:
- **`IND-1.1`** (Intervalo de Adquisición): Meta `5.0 s (±0.5 s)` $\implies 4.5 \le x \le 5.5\text{ s}$
- **`IND-1.2`** (Tasa de Entrega de Mensajes): Meta `> 98.0%` $\implies x > 98.0\%$ *(barra 0–100%)*
- **`IND-2.1`** (Error Absoluto Medio MAE): Meta `< 0.80 °C` $\implies x < 0.80\text{ °C}$ *(Si MAE $\ge 0.80\text{ °C}$, muestra honestamente «No cumple»)*
- **`IND-2.2`** (Error Cuadrático Medio RMSE): Meta `< 1.00 °C` $\implies x < 1.00\text{ °C}$
- **`IND-2.3`** (Coeficiente de Determinación $R^2$): Meta `> 0.85` $\implies x > 0.85$ *(barra 0–100%)*
- **`IND-3.1`** (Exactitud de Selección de Zona): Meta `100.0%` $\implies x \ge 99.9\%$ *(barra 0–100%)*
- **`IND-3.2`** (Latencia de Control Simulado ACK): Meta `< 200 ms` $\implies 0 < x < 200.0\text{ ms}$
- **`IND-4.1`** (Reducción Térmica $\Delta T$): Meta `Reducción > 2.0 °C` $\implies x > 2.0\text{ °C}$
- **`IND-4.2`** (Duty Cycle Ventilador): Meta `< 50.0%` $\implies x < 50.0\%$ *(barra 0–100%)*

#### Estados Oficiales del Sistema:
1. **«Meta cumplida»** (Verde esmeralda): El indicador satisface la meta técnica cuantitativa.
2. **«No cumple»** (Ámbar suave): El valor registrado excede o no alcanza la meta exigida.
3. **«Sin datos suficientes»** (Gris neutro): No se alcanza el mínimo de muestras requerido para la ventana evaluada.
4. **«Sin meta definida»** (Gris neutro): Métricas auxiliares sin cota o estándar establecido.

No se alteran los datos sintéticos para forzar cumplimientos artificiales. Las barras de progreso de 0% a 100% se muestran exclusivamente en indicadores porcentuales acotados (`IND-1.2`, `IND-2.3`, `IND-3.1`, `IND-4.2`). Las justificaciones metodológicas completas se ocultan por defecto tras el control **`Detalles`**.

### 2.2 Claridad Científica en Estadísticas (`STAT-01` a `STAT-04`)
En [`frontend/components/Views/StatisticsView.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/Views/StatisticsView.tsx) y [`mobile/src/screens/StatisticsScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/StatisticsScreen.tsx):
- Cada tarjeta presenta de inmediato el **nombre corto de la prueba** (*t de Student pareada*, *t de una muestra*, *ANOVA de un factor*, *Shapiro-Wilk*), el **estadístico**, el **`p-valor`**, la **muestra (`n`)** y un **resultado breve honesto** (*Diferencia significativa*, *Sin evidencia significativa*, *Distribución normal* o *Muestra insuficiente*).
- Las hipótesis $H_0$, $H_1$ y la interpretación detallada se despliegan bajo demanda mediante **`Ver análisis`**.

---

## 3. Cambios Visuales por Pantalla (Web vs. Móvil)

### 3.1 Plataforma Web (`frontend/` — Next.js 14 + Tailwind CSS)
- **Layout general ([`frontend/app/page.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/app/page.tsx)):** Sidebar colapsable refinado, barra superior única con el nombre corto de la sección activa (`Monitoreo`, `Indicadores`, `Estadísticas`, `Control`), estado de conexión, selector Claro/Oscuro y botón **`Acerca del proyecto`** ([`ProjectInfoModal.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/ProjectInfoModal.tsx)).
- **Monitoreo ([`LiveMonitoringView.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/Views/LiveMonitoringView.tsx)):**
  - 4 tarjetas KPI superiores (*Temperatura máxima*, *Temperatura promedio*, *Estado del ventilador*, *Zona activa*).
  - Barra de alerta compacta de una sola línea desplegable.
  - Cuerpo principal en 12 columnas: 8 columnas para el gráfico de evolución térmica y predicción (`+10 min`) con selector `PC 1–PC 5`, y 4 columnas para la lista compacta de las 5 computadoras.
  - Bloque inferior con el radar de orientación (`0°–180°`, etiquetado explícitamente como representación simulada del servomotor) y tabla limpia de actividad reciente.
- **Indicadores ([`IndicatorsView.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/Views/IndicatorsView.tsx)):** Cabecera compacta con métricas globales y cuadrícula `2x2` de dimensiones con validación matemática real y botón **`Detalles`**.
- **Estadísticas ([`StatisticsView.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/Views/StatisticsView.tsx)):** Cuadrícula `2x2` de pruebas inferenciales con métricas clave y botón **`Ver análisis`**.
- **Control ([`ControlDiagnosticsView.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/frontend/components/Views/ControlDiagnosticsView.tsx)):** Consola operativa ordenada del 1 al 7 (*Estado del sistema*, *Selector Manual/Automático*, *Control de ventilador*, *Selector de PC 1–5*, *Radar de orientación simulado*, *Escenarios de simulación* e *Historial de comandos*).

### 3.2 Aplicación Móvil (`mobile/` — React Native + Expo)
Diseñada específicamente para uso táctil vertical (Material 3), diferenciada del layout panorámico de escritorio:
- **Cabecera compacta y navegación inferior ([`mobile/App.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/App.tsx), [`BottomTabBar.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/components/BottomTabBar.tsx)):** 4 pestañas principales (*Monitoreo*, *Indicadores*, *Estadísticas*, *Control*) más accesos rápidos a Modo Claro/Oscuro, Historial y Configuración.
- **Monitoreo Móvil ([`HomeMonitoringScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/HomeMonitoringScreen.tsx)):** Tarjeta principal destacada (*Hero Card*) con temperatura máxima, promedio, ventilador y zona activa; lista compacta de las 5 estaciones térmicas con acceso al detalle individual ([`ZoneDetailScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/ZoneDetailScreen.tsx)); y gráfico limpio con selector táctil `PC 1–PC 5`.
- **Indicadores Móvil ([`IndicatorsScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/IndicatorsScreen.tsx)):** Chips horizontales de filtro por dimensión (*Todas*, *Transmisión*, *Predicción IA*, *Control*, *Térmica*), estado matemático real de cada meta y botón **`Detalles`**.
- **Estadísticas Móvil ([`StatisticsScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/StatisticsScreen.tsx)):** Tarjetas resumidas con `Estadístico`, `p-valor` y `Muestra (n)` que al tocarse despliegan las hipótesis $H_0$, $H_1$ y la conclusión.
- **Control Móvil ([`ControlScreen.tsx`](file:///c:/Users/Usuario/Documents/ghitub/iot-system/mobile/src/screens/ControlScreen.tsx)):** Selector segmentado (*Automático IA* / *Manual*), botones táctiles grandes para el ventilador, píldoras para elegir `PC 1–PC 5`, radar interactivo compacto y selector de escenarios de simulación.

---

## 4. Funcionalidades Preservadas Intactas

1. **Backend FastAPI (`backend/`):** Endpoints `/api/estado-actual`, `/api/historial`, `/api/indicadores`, `/api/indicadores-detallados`, `/api/pruebas-estadisticas`, `/api/control/manual`, `/api/control/modo`, `/api/simulacion/escenario` y `/api/simulacion/reiniciar` intactos.
2. **Simulador Termodinámico de 5 Zonas (`simulador/`):** Publicación MQTT continua hacia EMQX y respuesta con confirmaciones ACK simuladas.
3. **Persistencia MySQL (`database/`) y Modelo Predictivo Scikit-Learn (`backend/services/ml_service.py`):** Sin alteraciones ni regresiones.

---

## 5. Resultados Reales de Compilación y Verificación

- **Build de Producción Web (`docker compose up -d --build frontend`):** Compilación estática y de tipos de Next.js 14 exitosa (`exit code 0`).
- **Verificación TypeScript Móvil (`cd mobile && npx tsc --noEmit`):** `0` errores de tipos (`exit code 0`).
- **Servicios Activos Verificados por HTTP:**
  - Frontend Web (`http://localhost:3000`): `HTTP 200 OK`
  - Backend API (`http://localhost:8000/api/health`): `HTTP 200 OK`
  - Servidor Expo Mobile (`http://localhost:8081`): `HTTP 200 OK`

