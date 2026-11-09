import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, Path as PathParam, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.database import db_manager
from app.ml_model import ml_predictor
from app.mqtt_service import mqtt_service
from app.statistics_service import statistics_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando SMART COOLING IoT 2.0 — Backend Unificado & Motor ML...")
    db_manager.limpiar_y_sembrar_datos_demo()
    mqtt_service.iniciar()
    yield
    logger.info("🛑 Apagando servicio Backend & IA...")
    mqtt_service.detener()

app = FastAPI(
    title="SMART COOLING IoT 2.0 — API Unificada (Web & Mobile)",
    description=(
        "Fuente única de verdad para el Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT) - "
        "Universidad Nacional de Trujillo. Sincroniza Simulación de 5 Zonas, Scikit-Learn, Control Manual/Autónomo, "
        "Dashboard Web Next.js y Aplicación Móvil React Native."
    ),
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODELOS PYDANTIC =================

class ComandoManualRequest(BaseModel):
    zona: str = Field(..., description="Identificador de estación (zona1 a zona5)")
    fan_state: int = Field(..., ge=0, le=1, description="Estado del ventilador: 1 (ENCENDIDO) o 0 (APAGADO)")
    servo_angle: Optional[int] = Field(None, ge=0, le=180, description="Ángulo opcional del servomotor (0° a 180°)")

class ModoControlRequest(BaseModel):
    modo: str = Field(..., description="Modo de operación: 'autonomo' o 'manual'")

class EscenarioSimulacionRequest(BaseModel):
    escenario: str = Field(..., description="Escenario: 'normal', 'sobrecalentamiento', 'carga_extrema', 'demostracion', 'fallo_sensor'")
    zona_fallo_sensor: Optional[str] = Field("zona2", description="Zona sin señal cuando el escenario es 'fallo_sensor'")

class ReiniciarSimulacionRequest(BaseModel):
    escenario: Optional[str] = Field(None, description="Escenario opcional al cual reiniciar la simulación")

# ================= ENDPOINTS DE LA API REST =================

@app.get("/")
def raiz():
    return {
        "proyecto": "Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)",
        "version": "2.0.0",
        "universidad": "Universidad Nacional de Trujillo",
        "modo_operacion": settings.OPERATION_MODE,
        "estado": "En línea",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    """Verifica el estado de salud de Base de Datos, Broker MQTT y Simulador"""
    db_ok = False
    try:
        conn = db_manager.get_connection()
        db_ok = conn.is_connected()
        conn.close()
    except Exception:
        db_ok = False

    estado_sys = mqtt_service.estado_sistema
    return {
        "status": "healthy" if (db_ok and mqtt_service._conectado) else "degraded",
        "version": "2.0.0",
        "modo_operacion": estado_sys["modo_operacion_sistema"],
        "modo_control": estado_sys["modo_control"],
        "escenario_simulacion": estado_sys["escenario_simulacion"],
        "database_connected": db_ok,
        "mqtt_connected": mqtt_service._conectado,
        "total_mensajes": estado_sys["total_mensajes_recibidos"],
        "total_acks": estado_sys["total_acks_recibidos"],
        "ultima_actualizacion": estado_sys["ultima_actualizacion_telemetria"]
    }

@app.get("/api/telemetria/actual")
def obtener_telemetria_actual():
    """
    Retorna el estado enriquecido y sincronizado de las 5 computadoras (PC 1 a PC 5).
    Incluye disponibilidad de señal, predicción a +10m, estado de refrigeración y nivel térmico.
    """
    estado_mem = mqtt_service.obtener_estado_actual()
    zonas_mem = {z["zona"]: dict(z) for z in estado_mem["zonas"]}

    # Si aún no han llegado mensajes MQTT desde el arranque, complementar con último registro en BD
    if estado_mem["sistema"]["total_mensajes_recibidos"] == 0:
        registros_bd = db_manager.obtener_telemetria_actual()
        for reg in registros_bd:
            z_id = reg["zona"]
            if z_id in zonas_mem:
                zonas_mem[z_id]["temperatura_actual"] = reg["temperatura_actual"]
                zonas_mem[z_id]["temperatura_predicha"] = reg["temperatura_predicha"]
                zonas_mem[z_id]["timestamp"] = reg.get("timestamp")

    return [zonas_mem[k] for k in sorted(zonas_mem.keys())]

@app.get("/api/telemetria/zona/{zona_id}")
def obtener_detalle_zona(
    zona_id: str = PathParam(..., description="Identificador de estación: zona1 a zona5"),
    limit: int = Query(40, ge=5, le=200)
):
    """Retorna el expediente completo de una computadora específica (estado, historial y eventos)"""
    if zona_id not in settings.ZONAS_METADATOS:
        raise HTTPException(status_code=404, detail=f"La estación '{zona_id}' no existe.")

    estado_actual = mqtt_service.obtener_estado_actual()
    info_zona = next((z for z in estado_actual["zonas"] if z["zona"] == zona_id), None)
    historial = db_manager.obtener_historial_zona(zona=zona_id, limit=limit)
    eventos = db_manager.obtener_eventos_control(limit=15, zona=zona_id)
    alertas = [a for a in mqtt_service.obtener_alertas_activas() if a["zona"] == zona_id]

    return {
        "zona": zona_id,
        "modo_operacion": settings.OPERATION_MODE,
        "detalle": info_zona,
        "sistema": estado_actual["sistema"],
        "historial": historial,
        "eventos_recientes": eventos,
        "alertas": alertas
    }

@app.get("/api/telemetria/historial")
def obtener_historial_telemetria(
    zona: Optional[str] = Query("todas", description="zona1 a zona5 o 'todas'"),
    limit: int = Query(60, ge=5, le=300, description="Número de puntos históricos")
):
    """Retorna series temporales para graficar temperatura observada vs predicción a +10m"""
    historial = db_manager.obtener_historial_zona(zona=zona, limit=limit)
    return {
        "zona_filtrada": zona,
        "modo_operacion": settings.OPERATION_MODE,
        "total_registros": len(historial),
        "datos": historial
    }

@app.get("/api/alertas")
def obtener_alertas():
    """Retorna las alertas térmicas y de fallo de sensor activas en tiempo real"""
    alertas = mqtt_service.obtener_alertas_activas()
    return {
        "modo_operacion": settings.OPERATION_MODE,
        "total_alertas": len(alertas),
        "alertas": alertas
    }

@app.get("/api/metricas")
def calcular_metricas_predictivas(
    zona: Optional[str] = Query("todas", description="Filtrar por zona específica o 'todas'")
):
    """
    DIMENSIÓN 2: PRECISIÓN PREDICTIVA (MODELO ML)
    Calcula MAE, RMSE y R² sobre pares válidos en la base de datos.
    """
    pares = db_manager.obtener_pares_para_metricas(
        zona=zona,
        ventana_segundos=settings.VENTANA_PREDICCION_SEGUNDOS,
        tolerancia=45
    )

    metricas = ml_predictor.calcular_metricas(pares)
    return {
        "zona": zona,
        "modo_operacion": settings.OPERATION_MODE,
        "horizonte_minutos": 10,
        "mae": metricas["mae"],
        "rmse": metricas["rmse"],
        "r2": metricas["r2"],
        "suficiente": metricas["suficiente"],
        "estado": metricas["estado"],
        "muestras_evaluadas": metricas["muestras"],
        "interpretacion": {
            "mae_info": (
                f"En simulación, la predicción a +10m presenta un error medio de ±{metricas['mae']} °C."
                if metricas["mae"] is not None else "Esperando pares con desfase de 10 minutos."
            ),
            "rmse_info": (
                f"Raíz del error cuadrático medio en simulación: {metricas['rmse']} °C."
                if metricas["rmse"] is not None else "Muestras insuficientes para calcular RMSE."
            ),
            "r2_info": (
                f"Coeficiente de determinación R² = {metricas['r2']} sobre {metricas['muestras']} pares simulados."
                if metricas["r2"] is not None else "Se requieren al menos 2 pares con varianza térmica."
            )
        }
    }

@app.get("/api/indicadores")
def obtener_indicadores_investigacion():
    """Consolida las 4 dimensiones metodológicas y el estado global del sistema"""
    resumen = db_manager.obtener_resumen_indicadores()
    pares = db_manager.obtener_pares_para_metricas(zona="todas", ventana_segundos=600, tolerancia=45)
    metricas_ml = ml_predictor.calcular_metricas(pares)

    resumen["dimension_2"]["mae"] = metricas_ml["mae"]
    resumen["dimension_2"]["rmse"] = metricas_ml["rmse"]
    resumen["dimension_2"]["r2"] = metricas_ml["r2"]
    resumen["dimension_2"]["muestras"] = metricas_ml["muestras"]
    resumen["dimension_2"]["suficiente"] = metricas_ml["suficiente"]

    estado_completo = mqtt_service.obtener_estado_actual()
    resumen["estado_actual"] = estado_completo["sistema"]
    resumen["alertas_activas"] = len(mqtt_service.obtener_alertas_activas())
    return resumen

@app.get("/api/indicadores/detallado")
def obtener_indicadores_detallados():
    """Retorna el desglose completo de los 8 indicadores (IND-1.1 a IND-4.2)"""
    return statistics_service.obtener_indicadores_detallados()

@app.get("/api/estadisticas/pruebas")
def obtener_pruebas_estadisticas():
    """Ejecuta las 4 pruebas estadísticas inferenciales etiquetadas como simulación demostrativa"""
    return statistics_service.ejecutar_pruebas_estadisticas()

@app.get("/api/control/estado")
def obtener_estado_control():
    """Retorna el estado de control (modo, ventilador, ángulo del servomotor, zonas y escenarios)"""
    return mqtt_service.obtener_estado_actual()

@app.get("/api/control/eventos")
def obtener_eventos_control(
    limit: int = Query(25, ge=1, le=100),
    zona: Optional[str] = Query("todas")
):
    """Retorna el historial de comandos emitidos con su estado real (PENDIENTE, EJECUTADO_SIMULACION, TIMEOUT)"""
    return db_manager.obtener_eventos_control(limit=limit, zona=zona)

@app.post("/api/control/modo")
def cambiar_modo_control(solicitud: ModoControlRequest):
    """Permite alternar entre MODO AUTOMÁTICO ('autonomo') y MODO MANUAL ('manual')"""
    if solicitud.modo.lower() not in ("autonomo", "manual", "automatico"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El modo debe ser 'autonomo' o 'manual'."
        )
    modo_norm = "autonomo" if solicitud.modo.lower() in ("autonomo", "automatico") else "manual"
    return mqtt_service.cambiar_modo_control(modo_norm)

@app.post("/api/control/manual")
def ejecutar_control_manual(comando: ComandoManualRequest):
    """
    Envía una orden manual hacia el simulador (ventilador y servomotor),
    activando automáticamente el MODO MANUAL para que el lazo autónomo no sobrescriba al usuario.
    """
    if comando.zona not in settings.ZONAS_ANGULOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zona inválida '{comando.zona}'. Use zona1 a zona5."
        )
    return mqtt_service.ejecutar_control_manual(
        zona=comando.zona,
        fan_state=comando.fan_state,
        servo_angle=comando.servo_angle,
        activar_modo_manual=True
    )

@app.get("/api/simulacion/estado")
def obtener_estado_simulacion():
    """Retorna el escenario de simulación activo, catálogo de escenarios y estado de actuadores"""
    estado = mqtt_service.obtener_estado_actual()
    return {
        "modo_operacion": settings.OPERATION_MODE,
        "escenario_activo": estado["sistema"]["escenario_simulacion"],
        "zona_fallo_sensor": estado["sistema"].get("zona_fallo_sensor"),
        "modo_control": estado["sistema"]["modo_control"],
        "escenarios_disponibles": estado["escenarios_disponibles"],
        "sistema": estado["sistema"]
    }

@app.post("/api/simulacion/escenario")
def cambiar_escenario_simulacion(solicitud: EscenarioSimulacionRequest):
    """Permite seleccionar en vivo el escenario térmico del simulador sin editar archivos"""
    try:
        return mqtt_service.cambiar_escenario_simulacion(
            escenario=solicitud.escenario,
            zona_fallo_sensor=solicitud.zona_fallo_sensor or "zona2"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/simulacion/reiniciar")
def reiniciar_simulacion(solicitud: Optional[ReiniciarSimulacionRequest] = None):
    """Reinicia las temperaturas de las 5 zonas y el estado del simulador"""
    esc = solicitud.escenario if solicitud else None
    return mqtt_service.reiniciar_simulacion(escenario=esc)
