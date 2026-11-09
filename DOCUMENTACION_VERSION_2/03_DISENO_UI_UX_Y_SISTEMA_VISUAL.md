# 03. DISEÑO UI/UX Y SISTEMA VISUAL (SMART COOLING 2.0)

**Dirección Estética:** *Industrial Intelligence + Modern SaaS + Scientific Dashboard*

---

## 1. Identidad de Marca Original (`SMART COOLING`)

Se diseñó una identidad visual vectorial (SVG) original que representa la convergencia entre **dinámica térmica**, **flujo de aire direccionado por servomotor (`0°–180°`)** e **inteligencia artificial predictiva**:

- **Archivos Web (`frontend/`):**
  - `frontend/public/logo-mark.svg`: Isotipo cuadrado para barra lateral colapsada e íconos.
  - `frontend/public/logo-horizontal-dark.svg`: Logotipo horizontal para tema oscuro.
  - `frontend/public/logo-horizontal-light.svg`: Logotipo horizontal para tema claro.
  - `frontend/app/icon.svg`: Favicon vectorial de la aplicación web.
  - `frontend/components/BrandLogo.tsx`: Componente React adaptable.
- **Componente Nativo Móvil (`mobile/`):**
  - `mobile/src/components/BrandLogoNative.tsx`: Implementación vectorial en `react-native-svg` compatible con Android, iOS y Web.

---

## 2. Paleta de Colores y Tokens Semánticos

| Token Semántico | Modo Oscuro (`#0B0F17`) | Modo Claro (`#F1F5F9`) | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Fondo Principal (`bgMain`)** | `#0B0F17` | `#F1F5F9` | Lienzo base de baja fatiga visual en laboratorio. |
| **Superficie Elevada (`bgCard`)** | `#151F32` / `rgba(17,24,39,0.82)` | `#FFFFFF` | Tarjetas KPI, paneles de gráficos y modales. |
| **Acento Primario (`cyan`)** | `#06B6D4` | `#0891B2` | Flujo de aire activo, ventilador encendido, navegación activa. |
| **IA & Predicción (`indigo`)** | `#6366F1` | `#4F46E5` | Métricas del modelo Scikit-Learn (`R²`, `MAE`, `RMSE`). |
| **Estado Normal (`emerald`)** | `#10B981` | `#059669` | Temperatura estable (`< 31°C`), ACK confirmado, hipótesis validada. |
| **Simulación / Preventivo (`amber`)** | `#F59E0B` | `#D97706` | Insignia `MODO SIMULACIÓN`, predicción `+10m` elevada (`31°C – 34.9°C`). |
| **Crítico / Sobrecalentamiento (`rose`)** | `#F43F5E` | `#E11D48` | Temperatura crítica (`≥ 35.0°C`), alerta prioritaria. |
| **Sin Señal (`slate`)** | `#64748B` | `#94A3B8` | Sonda desconectada en escenario `fallo_sensor`. |

---

## 3. Jerarquía Tipográfica y Visualizaciones

- **Números Tabulares (`font-mono`):** Todas las lecturas de temperatura (`°C`), ángulos (`0°–180°`), latencias (`ms`) y estadísticos (`t`, `F`, `W`, `p-valor`) utilizan tipografía monoespaciada para evitar desplazamientos visuales durante el refresco en tiempo real.
- **Radar Cinemático Polar (`0° a 180°`):** Tanto en Web (`OrientationRadar.tsx`) como en Móvil (`RadarServoNative.tsx`), el usuario visualiza la orientación física simulada del servomotor SG90 hacia las 5 computadoras (`0°, 45°, 90°, 135°, 180°`) y puede tocar cualquier estación en el radar para orientar el flujo de aire directamente.

