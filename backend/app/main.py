import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.database import db_manager
from app.ml_model import ml_predictor
from app.mqtt_service import mqtt_service
from app.statistics_service import statistics_service

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando servicio Backend & IA (FastAPI)...")
    # Iniciar conexión y escucha de MQTT en segundo plano
    mqtt_service.iniciar()
    yield
    logger.info("🛑 Apagando servicio Backend & IA...")
    mqtt_service.detener()

app = FastAPI(
    title="Sistema de Enfriamiento Autónomo Inteligente IoT - API",
    description="Microservicio de Gestión Térmica, Machine Learning y Control Edge para Laboratorio UNT",
    version="1.0.0",
    lifespan=lifespan
)

# Permitir CORS para integración con Frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic para solicitudes
class ComandoManualRequest(BaseModel):
    zona: str
    fan_state: int
    servo_angle: Optional[int] = None

# ================= ENDPOINTS DE LA API REST =================

@app.get("/")
def raiz():
    return {
        "proyecto": "Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT)",
        "universidad": "Universidad Nacional de Trujillo",
        "estado": "En línea",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    """Verifica estado de salud de los servicios clave (Base de datos y MQTT)"""
    db_ok = False
    try:
        conn = db_manager.get_connection()
        db_ok = conn.is_connected()
        conn.close()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database_connected": db_ok,
        "mqtt_connected": mqtt_service._conectado,
        "total_mensajes": mqtt_service.estado_sistema["total_mensajes_recibidos"]
    }

@app.get("/api/telemetria/actual")
def obtener_telemetria_actual():
    """Retorna las lecturas más recientes de todas las zonas térmicas (físicas y virtuales)"""
    # Combinar lecturas de la base de datos con las lecturas activas en memoria
    registros_bd = db_manager.obtener_telemetria_actual()
    if registros_bd:
        return registros_bd
    
    # Respaldo con lecturas en memoria
    estado = mqtt_service.obtener_estado_actual()
    if estado["zonas"]:
        return estado["zonas"]

    # Valores por defecto de inicialización si recién arranca
    return [
        {"zona": "zona1", "temperatura_actual": 30.5, "temperatura_predicha": 31.8, "origen": "real", "estado_ventilador": 0, "angulo_servo": 0},
        {"zona": "zona2", "temperatura_actual": 29.8, "temperatura_predicha": 30.9, "origen": "real", "estado_ventilador": 0, "angulo_servo": 45},
        {"zona": "zona3", "temperatura_actual": 31.2, "temperatura_predicha": 32.5, "origen": "virtual", "estado_ventilador": 0, "angulo_servo": 90},
        {"zona": "zona4", "temperatura_actual": 33.4, "temperatura_predicha": 35.6, "origen": "virtual", "estado_ventilador": 1, "angulo_servo": 135},
        {"zona": "zona5", "temperatura_actual": 30.0, "temperatura_predicha": 31.0, "origen": "virtual", "estado_ventilador": 0, "angulo_servo": 180}
    ]

@app.get("/api/telemetria/historial")
def obtener_historial_telemetria(
    zona: Optional[str] = Query("todas", description="zona1 a zona5 o 'todas'"),
    limit: int = Query(60, ge=5, le=300, description="Número de puntos históricos")
):
    """Retorna series temporales para graficar en Recharts (Temperatura Actual vs Predicha)"""
    historial = db_manager.obtener_historial_zona(zona=zona, limit=limit)
    return {
        "zona_filtrada": zona,
        "total_registros": len(historial),
        "datos": historial
    }

@app.get("/api/metricas")
def calcular_metricas_predictivas(
    zona: Optional[str] = Query("todas", description="Filtrar por zona específica o 'todas'")
):
    """
    DIMENSIÓN 2: PRECISIÓN PREDICTIVA (MODELO ML)
    Calcula matemáticamente el MAE (2.1), RMSE (2.2) y R² (2.3)
    contrastando `temperatura_predicha` con la `temperatura_actual`
    recopilada aproximadamente 10 minutos (600s) después.
    """
    pares = db_manager.obtener_pares_para_metricas(
        zona=zona,
        ventana_segundos=settings.VENTANA_PREDICCION_SEGUNDOS,
        tolerancia=120
    )

    metricas = ml_predictor.calcular_metricas(pares)
    return {
        "zona": zona,
        "horizonte_minutos": 10,
        "mae": metricas["mae"],
        "rmse": metricas["rmse"],
        "r2": metricas["r2"],
        "muestras_evaluadas": metricas["muestras"],
        "interpretacion": {
            "mae_info": f"En promedio, la predicción a +10m difiere en ±{metricas['mae']} °C de la temperatura real.",
            "rmse_info": f"El error cuadrático medio pondera penalizaciones térmicas mayores: {metricas['rmse']} °C.",
            "r2_info": f"El modelo explica el {round(metricas['r2'] * 100, 1)}% de la variabilidad térmica observada."
        }
    }

@app.get("/api/indicadores")
def obtener_indicadores_investigacion():
    """
    OPERACIONALIZACIÓN COMPLETA DE VARIABLES (Sección 4 del requerimiento):
    - Dimensión 1: Transmisión y Arquitectura (Intervalo y Entrega)
    - Dimensión 2: Precisión Predictiva ML (MAE, RMSE, R²)
    - Dimensión 3: Respuesta de Control (Exactitud y Latencia de ACK)
    - Dimensión 4: Efectividad Térmica y Eficiencia (Delta T y Duty Cycle del Ventilador)
    """
    resumen = db_manager.obtener_resumen_indicadores()

    # Incorporar cálculo dinámico de métricas ML de la dimensión 2
    pares = db_manager.obtener_pares_para_metricas(zona="todas", ventana_segundos=600, tolerancia=120)
    metricas_ml = ml_predictor.calcular_metricas(pares)

    resumen["dimension_2"]["mae"] = metricas_ml["mae"]
    resumen["dimension_2"]["rmse"] = metricas_ml["rmse"]
    resumen["dimension_2"]["r2"] = metricas_ml["r2"]
    resumen["dimension_2"]["muestras"] = metricas_ml["muestras"]

    # Agregar información de estado actual del sistema
    resumen["estado_actual"] = mqtt_service.obtener_estado_actual()["sistema"]
    return resumen

@app.get("/api/estadisticas/pruebas")
def obtener_pruebas_estadisticas():
    """
    PRUEBAS ESTADÍSTICAS DE HIPÓTESIS (Validación Experimental):
    1. Prueba t de Student Pareada (Efectividad de reducción térmica antes vs después)
    2. Prueba t de Student de Una Muestra (Validación de latencia < 200ms)
    3. Análisis de Varianza One-Way ANOVA (Estrés térmico heterogéneo entre zonas)
    4. Prueba de Normalidad de Shapiro-Wilk (Distribución de residuos del modelo ML)
    """
    return statistics_service.ejecutar_pruebas_estadisticas()

@app.get("/api/indicadores/detallado")
def obtener_indicadores_detallados():
    """
    DESGLOSE COMPLETO POR CADA INDICADOR DE LAS 4 DIMENSIONES:
    - Dimensión 1: IND-1.1 (Intervalo), IND-1.2 (Tasa Entrega)
    - Dimensión 2: IND-2.1 (MAE), IND-2.2 (RMSE), IND-2.3 (R²)
    - Dimensión 3: IND-3.1 (Selección Zona), IND-3.2 (Latencia de Control)
    - Dimensión 4: IND-4.1 (Delta Térmico ΔT), IND-4.2 (Duty Cycle Fan / Ahorro)
    """
    return statistics_service.obtener_indicadores_detallados()

@app.get("/api/control/estado")
def obtener_estado_control():
    """Retorna el estado de actuación actual (Ventilador ON/OFF, Ángulo del servo y zona activa)"""
    return mqtt_service.obtener_estado_actual()

@app.get("/api/control/eventos")
def obtener_eventos_control(limit: int = Query(15, ge=1, le=100)):
    """Retorna el historial de decisiones de control con latencias de ACK"""
    eventos = db_manager.obtener_eventos_control(limit=limit)
    return eventos

@app.post("/api/control/manual")
def ejecutar_control_manual(comando: ComandoManualRequest):
    """Permite al operador forzar la orientación del servomotor y el estado del ventilador"""
    if comando.fan_state not in [0, 1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fan_state debe ser 0 (apagado) o 1 (encendido)"
        )
    return mqtt_service.ejecutar_control_manual(
        zona=comando.zona,
        fan_state=comando.fan_state,
        servo_angle=comando.servo_angle
    )
