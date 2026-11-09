# 01. CAMBIOS REALIZADOS EN SMART COOLING IoT 2.0

**Proyecto:** Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)  
**Institución:** Universidad Nacional de Trujillo (UNT)  
**Versión:** 2.0.0 (`MODO SIMULACIÓN UNIFICADO`)

---

## 1. Resumen Ejecutivo de la Transformación

La versión **SMART COOLING IoT 2.0** resuelve la totalidad de los hallazgos arquitectónicos, estadísticos, visuales y de integración detectados en la auditoría técnica inicial (`AUDITORIA_COMPLETA_IOT/`), adaptando la plataforma para operar **100% sin hardware físico conectado** mediante un motor de simulación termodinámica de cinco zonas integrado de extremo a extremo.

---

## 2. Problemas Corregidos de la Auditoría Inicial

| Código | Hallazgo en Versión 1.0 | Solución Implementada en Versión 2.0 |
| :--- | :--- | :--- |
| **CRIT-01** | Desconexión entre las zonas físicas (`zona1`, `zona2`) y el simulador original (que solo emitía `zona3`, `zona4`, `zona5`). | `simulador/simulador.py` ahora simula por defecto las **5 zonas completas (`PC 1` a `PC 5`)** con inercia térmica de Newton, acoplamiento convectivo al ventilador/servomotor y respuesta ACK correlacionada. |
| **CRIT-02** | El modo manual desde Web o App Móvil era sobrescrito a los 5 segundos por el algoritmo autónomo del backend. | Se implementó estado persistente `modo_control` (`"autonomo"` vs `"manual"`) en `backend/app/mqtt_service.py` y el endpoint `POST /api/control/modo`. En modo manual, el bucle autónomo respeta las órdenes del operador. |
| **CRIT-03** | Datos fabricados en pruebas estadísticas (`RAND()` en SQL, semillas fijas `np.random.seed(42)` y latencias constantes falsas de `42 ms` / `45 ms`). | Se eliminaron todas las semillas y constantes artificiales en `backend/app/statistics_service.py` y `backend/app/database.py`. Todas las pruebas (`t-Student pareada`, `t-Student 1 muestra`, `ANOVA`, `Shapiro-Wilk`) consultan registros reales en MySQL, reportan el tamaño muestral `n`, el estado `SUFICIENTE` / `MUESTRAS_INSUFICIENTES` y llevan la advertencia explícita de **MODO SIMULACIÓN**. |
| **CRIT-04** | La aplicación móvil React Native dependía de conexión directa WebSocket MQTT con IP cableada (`192.168.1.5`) y carecía de vistas de Indicadores y Estadísticas. | Se rediseñó `mobile/` como aplicación multi-pantalla completa consumiendo **FastAPI REST** como fuente única de verdad, con autodetección de IP (`localhost` en Web, IP LAN `192.168.0.23` en Expo Go) y pantalla de Configuración. |
| **ALT-01** | Sobreconteo 5x del tiempo de encendido del ventilador (`minutos_fan_on`) al sumar filas de las 5 zonas por separado. | Corregido en `backend/app/database.py` agrupando por ventana temporal única de 5 segundos. |
| **ALT-02** | Extrapolación lineal agresiva en `ml_model.py` cuando la ventana tenía pocos puntos. | Se añadió factor de amortiguamiento proporcional a la cobertura temporal de la ventana (`factor_amortiguamiento`) y límites físicos razonables. |
| **MED-01** | Monolito de más de 1,000 líneas en `frontend/app/page.tsx`. | Refactorizado en módulos tipados bajo `frontend/types/iot.ts`, `frontend/services/api.ts`, `frontend/components/` y `frontend/components/Views/`. |

---

## 3. Nuevos Endpoints en FastAPI (`backend/app/main.py`)

- `GET /api/telemetria/zona/{zona_id}`: Expediente completo de una computadora (`PC 1` a `PC 5`), incluyendo su serie histórica, eventos recientes y alertas.
- `GET /api/alertas`: Lista estructurada en vivo de alertas críticas, preventivas IA y de fallo de sensor (`SIN SEÑAL`).
- `POST /api/control/modo`: Alterna entre `"autonomo"` (gobernanza predictiva Scikit-Learn) y `"manual"` (mando directo por usuario).
- `GET /api/simulacion/estado`: Estado actual del simulador termodinámico y catálogo de escenarios.
- `POST /api/simulacion/escenario`: Cambia en vivo entre los 5 escenarios (`normal`, `sobrecalentamiento`, `carga_extrema`, `demostracion`, `fallo_sensor`) vía MQTT sin reiniciar contenedores ni editar código.
- `POST /api/simulacion/reiniciar`: Restablece las temperaturas de las 5 zonas, el historial en memoria del regresor y la posición de los actuadores.

