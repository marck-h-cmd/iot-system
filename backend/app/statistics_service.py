"""
=========================================================================================
PROYECTO: Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos (IoT) 2.0
MÓDULO: Servicio de Pruebas Estadísticas Inferenciales e Indicadores Operacionales
UNIVERSIDAD: Universidad Nacional de Trujillo (UNT)
=========================================================================================
Implementa las pruebas estadísticas inferenciales y el desglose de los 8 indicadores
metodológicos sobre los datos reales almacenados en MySQL, indicando con transparencia:
- El tamaño de muestra real (n) disponible en la base de datos.
- El origen demostrativo/simulado de los datos (`origen_datos = "simulacion"`).
- El estado de suficiencia de muestras (`suficiente = True / False`), sin fabricar valores
  artificiales con RAND() ni suplantar validaciones físicas con semillas ocultas.
=========================================================================================
"""

import logging
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from scipy import stats
from app.database import db_manager
from app.ml_model import ml_predictor

logger = logging.getLogger("backend.statistics")

def evaluar_meta_indicador_metodologico(codigo: str, valor: Optional[float], muestras: int = 0) -> Dict[str, Any]:
    """
    Evalúa matemáticamente el cumplimiento de la meta para cada indicador según su operador:
    - Si cumple: 'Meta cumplida'
    - Si no cumple: 'No cumple'
    - Si faltan muestras o datos válidos: 'Sin datos suficientes'
    - Si no existe una meta definida: 'Sin meta definida'
    """
    if valor is None or np.isnan(valor):
        return {
            "cumple": False,
            "estado_meta": "sin_datos_suficientes",
            "etiqueta_meta": "Sin datos suficientes",
            "operador": None,
            "meta_valor": None
        }

    # Umbrales mínimos de muestras requeridas para validez de indicador
    muestras_minimas = {
        "IND-1.1": 2,
        "IND-1.2": 1,
        "IND-2.1": 3,
        "IND-2.2": 3,
        "IND-2.3": 3,
        "IND-3.1": 1,
        "IND-3.2": 1,
        "IND-4.1": 1,
        "IND-4.2": 1,
    }

    min_req = muestras_minimas.get(codigo, 1)
    if muestras < min_req:
        return {
            "cumple": False,
            "estado_meta": "sin_datos_suficientes",
            "etiqueta_meta": "Sin datos suficientes",
            "operador": None,
            "meta_valor": None
        }

    if codigo == "IND-1.1":
        # Meta: 5.0 s (±0.5 s) -> 4.5 <= valor <= 5.5
        cumple = 4.5 <= valor <= 5.5
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "4.5 <= x <= 5.5",
            "meta_valor": 5.0
        }
    elif codigo == "IND-1.2":
        # Meta: > 98.0%
        cumple = valor > 98.0
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": ">",
            "meta_valor": 98.0
        }
    elif codigo == "IND-2.1":
        # Meta: MAE < 0.80 °C
        cumple = valor < 0.80
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "<",
            "meta_valor": 0.80
        }
    elif codigo == "IND-2.2":
        # Meta: RMSE < 1.00 °C
        cumple = valor < 1.00
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "<",
            "meta_valor": 1.00
        }
    elif codigo == "IND-2.3":
        # Meta: R² > 0.85
        cumple = valor > 0.85
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": ">",
            "meta_valor": 0.85
        }
    elif codigo == "IND-3.1":
        # Meta: Exactitud de Selección = 100.0%
        cumple = valor >= 99.9
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "==",
            "meta_valor": 100.0
        }
    elif codigo == "IND-3.2":
        # Meta: Latencia < 200 ms
        cumple = 0.0 < valor < 200.0
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "<",
            "meta_valor": 200.0
        }
    elif codigo == "IND-4.1":
        # Meta: Reducción térmica ΔT > 2.0 °C
        cumple = valor > 2.0
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": ">",
            "meta_valor": 2.0
        }
    elif codigo == "IND-4.2":
        # Meta: Duty cycle ventilador < 50.0%
        cumple = valor < 50.0
        return {
            "cumple": cumple,
            "estado_meta": "cumplida" if cumple else "no_cumple",
            "etiqueta_meta": "Meta cumplida" if cumple else "No cumple",
            "operador": "<",
            "meta_valor": 50.0
        }
    else:
        return {
            "cumple": False,
            "estado_meta": "sin_meta_definida",
            "etiqueta_meta": "Sin meta definida",
            "operador": None,
            "meta_valor": None
        }

class StatisticsService:
    def __init__(self):
        pass

    def ejecutar_pruebas_estadisticas(self) -> Dict[str, Any]:
        """
        Ejecuta las 4 pruebas estadísticas inferenciales del proyecto sobre los datos
        registrados en la base de datos:
        1. Prueba t de Student pareada (Temperatura al activar ventilación vs Temperatura tras enfriamiento)
        2. Prueba t de Student de 1 muestra (Latencia de control simulado < 200 ms)
        3. Análisis de Varianza One-Way ANOVA (Diferencia térmica entre las 5 computadoras)
        4. Prueba de Normalidad de Shapiro-Wilk (Distribución de residuos del modelo ML)
        """
        etiqueta_origen = "Telemetría simulada por MQTT"

        # =========================================================================
        # 1. PRUEBA t DE STUDENT PAREADA (Efectividad Térmica de Refrigeración)
        # =========================================================================
        temp_antes, temp_despues = self._obtener_pares_reales_enfriamiento()
        n_enf = len(temp_antes)

        if n_enf >= 3:
            diferencias = temp_antes - temp_despues
            media_antes = float(np.mean(temp_antes))
            media_despues = float(np.mean(temp_despues))
            media_dif = float(np.mean(diferencias))
            std_dif = float(np.std(diferencias, ddof=1))

            if std_dif > 1e-6:
                t_stat_enf, p_val_enf = stats.ttest_rel(temp_antes, temp_despues, alternative="greater")
                t_val = round(float(t_stat_enf), 3)
                p_val = round(float(p_val_enf), 6)
                d_cohen = round(media_dif / std_dif, 3)
            else:
                t_val, p_val, d_cohen = None, None, None

            sig_enf = p_val is not None and p_val < 0.05 and media_dif > 0
            prueba_enfriamiento = {
                "nombre": "Prueba t de Student para Muestras Pareadas",
                "variable": "Efectividad Térmica (T_disparo vs T_post_enfriamiento en Simulación)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "SUFICIENTE" if p_val is not None else "VARIANZA_CERO",
                "suficiente": p_val is not None,
                "hipotesis_nula": "H0: μ_antes ≤ μ_después (El flujo de aire no reduce la temperatura)",
                "hipotesis_alternativa": "H1: μ_después < μ_antes (La ventilación reduce la temperatura)",
                "n_muestras": n_enf,
                "n_minimo_recomendado": 3,
                "media_antes_c": round(media_antes, 2),
                "media_despues_c": round(media_despues, 2),
                "reduccion_media_c": round(media_dif, 2),
                "estadistico_t": t_val,
                "p_valor": p_val,
                "nivel_significancia": 0.05,
                "d_cohen": d_cohen,
                "magnitud_efecto": None if d_cohen is None else (
                    "Grande" if abs(d_cohen) >= 0.8 else "Moderada" if abs(d_cohen) >= 0.5 else "Leve"
                ),
                "es_significativo": sig_enf,
                "conclusion": (
                    f"Variación media de {media_dif:+.2f} °C en {n_enf} pares simulados. "
                    + (f"Prueba unilateral exploratoria con p={p_val:.4f}."
                       if p_val is not None else "Las diferencias son constantes.")
                )
            }
        else:
            prueba_enfriamiento = {
                "nombre": "Prueba t de Student para Muestras Pareadas",
                "variable": "Efectividad Térmica (T_disparo vs T_post_enfriamiento en Simulación)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "MUESTRAS_INSUFICIENTES",
                "suficiente": False,
                "hipotesis_nula": "H0: μ_antes ≤ μ_después (El flujo de aire no reduce la temperatura)",
                "hipotesis_alternativa": "H1: μ_después < μ_antes (La ventilación reduce la temperatura)",
                "n_muestras": n_enf,
                "n_minimo_recomendado": 3,
                "media_antes_c": round(float(np.mean(temp_antes)), 2) if n_enf > 0 else None,
                "media_despues_c": round(float(np.mean(temp_despues)), 2) if n_enf > 0 else None,
                "reduccion_media_c": None,
                "estadistico_t": None,
                "p_valor": None,
                "nivel_significancia": 0.05,
                "d_cohen": None,
                "magnitud_efecto": "Muestras insuficientes",
                "es_significativo": False,
                "conclusion": (
                    f"Muestras insuficientes ({n_enf}/3 ciclos de enfriamiento con lectura posterior registrada). "
                    "Se necesitan lecturas simuladas entre 120 y 135 segundos después de órdenes confirmadas."
                )
            }

        # =========================================================================
        # 2. PRUEBA t DE STUDENT DE 1 MUESTRA (Latencia de Control Simulado < 200 ms)
        # =========================================================================
        latencias = self._obtener_muestras_latencia_reales()
        n_lat = len(latencias)

        if n_lat >= 3:
            media_lat = float(np.mean(latencias))
            std_lat = float(np.std(latencias, ddof=1))
            if std_lat > 1e-6:
                t_stat_lat, p_val_lat = stats.ttest_1samp(latencias, popmean=200.0, alternative="less")
                t_lat = round(float(t_stat_lat), 3)
                p_lat = round(float(p_val_lat), 6)
            else:
                t_lat, p_lat = None, None

            sig_lat = p_lat is not None and p_lat < 0.05 and media_lat < 200.0
            prueba_latencia = {
                "nombre": "Prueba t de Student para Una Muestra",
                "variable": "Latencia de Bucle Cerrado en Simulación (Orden Backend -> ACK Simulador)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "SUFICIENTE" if p_lat is not None else "VARIANZA_CERO",
                "suficiente": p_lat is not None,
                "umbral_critico_ms": 200.0,
                "hipotesis_nula": "H0: μ_latencia ≥ 200 ms (Excede el umbral de respuesta rápida)",
                "hipotesis_alternativa": "H1: μ_latencia < 200 ms (Cumple tiempo de respuesta < 200 ms)",
                "n_muestras": n_lat,
                "n_minimo_recomendado": 3,
                "media_latencia_ms": round(media_lat, 2),
                "desviacion_std_ms": round(std_lat, 2),
                "estadistico_t": t_lat,
                "p_valor": p_lat,
                "es_significativo": sig_lat,
                "conclusion": (
                    f"Latencia media de {media_lat:.2f} ms en {n_lat} confirmaciones MQTT. "
                    + (f"Prueba frente a 200 ms con p={p_lat:.4f}." if p_lat is not None else "Las latencias son constantes.")
                )
            }
        else:
            prueba_latencia = {
                "nombre": "Prueba t de Student para Una Muestra",
                "variable": "Latencia de Bucle Cerrado en Simulación (Orden Backend -> ACK Simulador)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "MUESTRAS_INSUFICIENTES",
                "suficiente": False,
                "umbral_critico_ms": 200.0,
                "hipotesis_nula": "H0: μ_latencia ≥ 200 ms",
                "hipotesis_alternativa": "H1: μ_latencia < 200 ms",
                "n_muestras": n_lat,
                "n_minimo_recomendado": 3,
                "media_latencia_ms": round(float(np.mean(latencias)), 2) if n_lat > 0 else None,
                "desviacion_std_ms": None,
                "estadistico_t": None,
                "p_valor": None,
                "es_significativo": False,
                "conclusion": (
                    f"Muestras insuficientes ({n_lat}/3 comandos con confirmación ACK registrada). "
                    "Envíe órdenes desde la vista Control o espere la activación automática del ventilador."
                )
            }

        # =========================================================================
        # 3. PRUEBA ANOVA DE 1 VÍA (Variabilidad Térmica entre las 5 Zonas)
        # =========================================================================
        grupos_zonas, conteo_por_zona = self._obtener_temperaturas_por_zonas_reales()
        zonas_con_datos = [g for g in grupos_zonas if len(g) >= 2]
        n_total_anova = int(sum(len(g) for g in zonas_con_datos))

        if len(zonas_con_datos) >= 2 and n_total_anova >= 6:
            try:
                f_stat, p_val_anova = stats.f_oneway(*zonas_con_datos)
                f_val = round(float(f_stat), 3) if np.isfinite(f_stat) else None
                p_anova = round(float(p_val_anova), 6) if f_val is not None and np.isfinite(p_val_anova) else None
            except Exception:
                f_val, p_anova = None, None

            sig_anova = p_anova is not None and p_anova < 0.05
            prueba_anova = {
                "nombre": "Análisis de Varianza de Un Factor (One-Way ANOVA)",
                "variable": "Distribución Térmica Inter-Zonas (PC 1 a PC 5)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "SUFICIENTE" if p_anova is not None else "VARIANZA_CERO",
                "suficiente": p_anova is not None,
                "n_muestras": n_total_anova,
                "zonas_evaluadas": len(zonas_con_datos),
                "muestras_por_zona": conteo_por_zona,
                "hipotesis_nula": "H0: μ_PC1 = μ_PC2 = μ_PC3 = μ_PC4 = μ_PC5 (Estrés térmico homogéneo)",
                "hipotesis_alternativa": "H1: Al menos una computadora presenta temperatura media distinta",
                "estadistico_f": f_val,
                "p_valor": p_anova,
                "es_significativo": sig_anova,
                "conclusion": (
                    f"{n_total_anova} lecturas simuladas de {len(zonas_con_datos)} zonas. "
                    + (f"Comparación exploratoria con F={f_val}, p={p_anova:.4f}."
                       if p_anova is not None else "La varianza entre lecturas de cada zona no permite la prueba.")
                )
            }
        else:
            prueba_anova = {
                "nombre": "Análisis de Varianza de Un Factor (One-Way ANOVA)",
                "variable": "Distribución Térmica Inter-Zonas (PC 1 a PC 5)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "MUESTRAS_INSUFICIENTES",
                "suficiente": False,
                "n_muestras": n_total_anova,
                "zonas_evaluadas": len(zonas_con_datos),
                "muestras_por_zona": conteo_por_zona,
                "hipotesis_nula": "H0: μ_PC1 = μ_PC2 = μ_PC3 = μ_PC4 = μ_PC5",
                "hipotesis_alternativa": "H1: Al menos una zona presenta mayor temperatura media",
                "estadistico_f": None,
                "p_valor": None,
                "es_significativo": False,
                "conclusion": f"Muestras insuficientes ({n_total_anova} lecturas). Se requieren al menos 2 muestras en ≥2 zonas."
            }

        # =========================================================================
        # 4. PRUEBA DE NORMALIDAD DE SHAPIRO-WILK (Residuos del Modelo ML)
        # =========================================================================
        residuos = self._obtener_residuos_ml_reales()
        n_res = len(residuos)

        if n_res >= 3 and np.ptp(residuos) > 0:
            try:
                w_stat, p_val_norm = stats.shapiro(residuos)
                w_val = round(float(w_stat), 4)
                p_norm = round(float(p_val_norm), 4)
            except Exception:
                w_val, p_norm = None, None

            es_normal = p_norm is not None and p_norm >= 0.05
            prueba_normalidad = {
                "nombre": "Prueba de Normalidad de Shapiro-Wilk",
                "variable": "Residuos de Predicción del Modelo ML (T_observada - T_predicha)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "SUFICIENTE" if p_norm is not None else "ERROR",
                "suficiente": p_norm is not None,
                "hipotesis_nula": "H0: Los errores de predicción provienen de una distribución normal",
                "hipotesis_alternativa": "H1: Los errores se desvían de la normalidad",
                "n_muestras": n_res,
                "n_minimo_recomendado": 3,
                "estadistico_w": w_val,
                "p_valor": p_norm,
                "es_normal": es_normal,
                "conclusion": (
                    f"[Resultado Demostrativo en Simulación] Evaluados n={n_res} residuos de predicción "
                    f"(W={w_val}, p={p_norm:.4f}). "
                    + ("Sin evidencia para rechazar normalidad." if es_normal else "Se rechaza la hipótesis de normalidad.")
                    if p_norm is not None else "La prueba no produjo un resultado válido."
                )
            }
        else:
            prueba_normalidad = {
                "nombre": "Prueba de Normalidad de Shapiro-Wilk",
                "variable": "Residuos de Predicción del Modelo ML (T_observada - T_predicha)",
                "origen_datos": etiqueta_origen,
                "estado_muestra": "VARIANZA_CERO" if n_res >= 3 else "MUESTRAS_INSUFICIENTES",
                "suficiente": False,
                "hipotesis_nula": "H0: Los errores de predicción siguen una distribución normal",
                "hipotesis_alternativa": "H1: Los errores no siguen una distribución normal",
                "n_muestras": n_res,
                "n_minimo_recomendado": 3,
                "estadistico_w": None,
                "p_valor": None,
                "es_normal": False,
                "conclusion": (
                    "Los residuos son constantes." if n_res >= 3 else
                    f"Se requieren al menos 3 pares con desfase de 10 minutos. Disponibles: {n_res}."
                )
            }

        return {
            "estado": "exitoso",
            "modo_operacion": "simulacion",
            "aviso_metodologico": "Pruebas exploratorias sobre series simuladas por MQTT. Las lecturas consecutivas pueden estar autocorrelacionadas.",
            "pruebas": {
                "t_student_enfriamiento": prueba_enfriamiento,
                "t_student_latencia": prueba_latencia,
                "anova_zonas": prueba_anova,
                "normalidad_residuos": prueba_normalidad
            }
        }

    def obtener_indicadores_detallados(self) -> Dict[str, Any]:
        """
        Retorna el análisis cuantitativo para los 8 indicadores de las 4 dimensiones,
        incluyendo unidad, descripción, interpretación y disponibilidad real de muestras.
        """
        resumen = db_manager.obtener_resumen_indicadores()
        pares_ml = db_manager.obtener_pares_para_metricas(zona="todas", ventana_segundos=600, tolerancia=45)
        metricas_ml = ml_predictor.calcular_metricas(pares_ml)

        total_msgs = resumen["dimension_1"]["total_mensajes"]
        intervalo_val = resumen["dimension_1"].get("intervalo_adquisicion_seg")
        std_int = resumen["dimension_1"].get("desviacion_intervalo_seg")
        tasa_entrega = resumen["dimension_1"].get("tasa_entrega_pct")

        total_ev = resumen["dimension_3"].get("total_eventos", 0)
        lat_prom = resumen["dimension_3"].get("latencia_promedio_ms")
        tasa_ack = resumen["dimension_3"].get("tasa_ack_pct")

        antes, despues = self._obtener_pares_reales_enfriamiento()
        delta_t = round(float(np.mean(antes - despues)), 2) if len(antes) >= 3 else None
        duty_fan = resumen["dimension_4"].get("fraccion_lecturas_fan_pct")

        ind_1_1_meta = evaluar_meta_indicador_metodologico("IND-1.1", intervalo_val, total_msgs)
        ind_1_2_meta = evaluar_meta_indicador_metodologico("IND-1.2", tasa_entrega, total_msgs)
        ind_2_1_meta = evaluar_meta_indicador_metodologico("IND-2.1", metricas_ml["mae"], metricas_ml["muestras"])
        ind_2_2_meta = evaluar_meta_indicador_metodologico("IND-2.2", metricas_ml["rmse"], metricas_ml["muestras"])
        ind_2_3_meta = evaluar_meta_indicador_metodologico("IND-2.3", metricas_ml["r2"], metricas_ml["muestras"])
        ind_3_1_meta = evaluar_meta_indicador_metodologico("IND-3.1", None)
        ind_3_2_meta = evaluar_meta_indicador_metodologico("IND-3.2", lat_prom, total_ev)
        ind_4_1_meta = evaluar_meta_indicador_metodologico("IND-4.1", delta_t, total_msgs)

        return {
            "modo_operacion": "simulacion",
            "etiqueta_origen": "Resultados calculados con datos sintéticos en MODO SIMULACIÓN",
            "dimension_1_transmision": {
                "titulo": "Dimensión 1: Transmisión y Arquitectura IoT",
                "indicadores": [
                    {
                        "codigo": "IND-1.1",
                        "nombre": "Intervalo de Adquisición",
                        "valor_numerico": intervalo_val,
                        "valor": f"{intervalo_val} s" if intervalo_val is not None else "Sin muestras",
                        "unidad": "s",
                        "meta": "5.0 s (±0.5 s)",
                        "desviacion_std": f"±{std_int} s" if std_int is not None else "N/A",
                        "muestras": total_msgs,
                        "disponible": intervalo_val is not None,
                        "cumple": ind_1_1_meta["cumple"],
                        "estado_meta": ind_1_1_meta["estado_meta"],
                        "etiqueta_meta": ind_1_1_meta["etiqueta_meta"],
                        "estado": ind_1_1_meta["etiqueta_meta"],
                        "descripcion": "Tiempo promedio transcurrido entre lecturas consecutivas de una misma zona.",
                        "interpretacion": (
                            f"El simulador publica telemetría cada {intervalo_val} s en promedio sobre {total_msgs} paquetes registrados."
                            if intervalo_val is not None else "Esperando al menos 2 ciclos de telemetría por zona."
                        )
                    },
                    {
                        "codigo": "IND-1.2",
                        "nombre": "Tasa de Entrega de Mensajes",
                        "valor_numerico": tasa_entrega,
                        "valor": f"{tasa_entrega}%" if tasa_entrega is not None else "Sin muestras",
                        "unidad": "%",
                        "meta": "> 98.0%",
                        "total_paquetes": total_msgs,
                        "muestras": total_msgs,
                        "disponible": tasa_entrega is not None,
                        "cumple": ind_1_2_meta["cumple"],
                        "estado_meta": ind_1_2_meta["estado_meta"],
                        "etiqueta_meta": ind_1_2_meta["etiqueta_meta"],
                        "estado": ind_1_2_meta["etiqueta_meta"],
                        "descripcion": "Proporción de paquetes MQTT publicados que fueron persistidos exitosamente en MySQL.",
                        "interpretacion": f"Se han persistido {total_msgs} registros térmicos en la base de datos relacional."
                    }
                ]
            },
            "dimension_2_ml": {
                "titulo": "Dimensión 2: Precisión Predictiva (Scikit-Learn +10 min)",
                "indicadores": [
                    {
                        "codigo": "IND-2.1",
                        "nombre": "Error Absoluto Medio (MAE)",
                        "valor_numerico": metricas_ml["mae"],
                        "valor": f"±{metricas_ml['mae']} °C" if metricas_ml["mae"] is not None else "Muestras insuficientes",
                        "unidad": "°C",
                        "meta": "< 0.80 °C",
                        "muestras": metricas_ml["muestras"],
                        "disponible": metricas_ml["mae"] is not None,
                        "cumple": ind_2_1_meta["cumple"],
                        "estado_meta": ind_2_1_meta["estado_meta"],
                        "etiqueta_meta": ind_2_1_meta["etiqueta_meta"],
                        "estado": ind_2_1_meta["etiqueta_meta"],
                        "descripcion": "Promedio de la diferencia absoluta entre la predicción a +10m y la temperatura observada 10 minutos después.",
                        "interpretacion": (
                            f"Error medio de ±{metricas_ml['mae']} °C evaluado sobre {metricas_ml['muestras']} pares sintéticos."
                            if metricas_ml["mae"] is not None else "Se requieren pares separados por 10 minutos."
                        )
                    },
                    {
                        "codigo": "IND-2.2",
                        "nombre": "Error Cuadrático Medio (RMSE)",
                        "valor_numerico": metricas_ml["rmse"],
                        "valor": f"{metricas_ml['rmse']} °C" if metricas_ml["rmse"] is not None else "Muestras insuficientes",
                        "unidad": "°C",
                        "meta": "< 1.00 °C",
                        "muestras": metricas_ml["muestras"],
                        "disponible": metricas_ml["rmse"] is not None,
                        "cumple": ind_2_2_meta["cumple"],
                        "estado_meta": ind_2_2_meta["estado_meta"],
                        "etiqueta_meta": ind_2_2_meta["etiqueta_meta"],
                        "estado": ind_2_2_meta["etiqueta_meta"],
                        "descripcion": "Raíz del error cuadrático medio; penaliza con mayor peso las desviaciones térmicas grandes.",
                        "interpretacion": (
                            f"RMSE de {metricas_ml['rmse']} °C en {metricas_ml['muestras']} pares evaluados."
                            if metricas_ml["rmse"] is not None else "Esperando historial con desfase de 10 minutos."
                        )
                    },
                    {
                        "codigo": "IND-2.3",
                        "nombre": "Coeficiente de Determinación (R²)",
                        "valor_numerico": metricas_ml["r2"],
                        "valor": f"{metricas_ml['r2']}" if metricas_ml["r2"] is not None else "Muestras insuficientes",
                        "unidad": "adimensional",
                        "meta": "> 0.85",
                        "muestras": metricas_ml["muestras"],
                        "disponible": metricas_ml["r2"] is not None,
                        "cumple": ind_2_3_meta["cumple"],
                        "estado_meta": ind_2_3_meta["estado_meta"],
                        "etiqueta_meta": ind_2_3_meta["etiqueta_meta"],
                        "estado": ind_2_3_meta["etiqueta_meta"],
                        "descripcion": "Fracción de la varianza térmica futura explicada por el regresor lineal.",
                        "interpretacion": (
                            f"Ajuste R² = {metricas_ml['r2']} sobre {metricas_ml['muestras']} pares de simulación."
                            if metricas_ml["r2"] is not None else "Se necesitan al menos 2 pares con varianza no nula."
                        )
                    }
                ]
            },
            "dimension_3_control": {
                "titulo": "Dimensión 3: Respuesta de Control y Actuación",
                "indicadores": [
                    {
                        "codigo": "IND-3.1",
                        "nombre": "Exactitud de Selección de Zona",
                        "valor_numerico": None,
                        "valor": "Sin verificación",
                        "unidad": "%",
                        "meta": "100.0%",
                        "muestras": total_ev,
                        "disponible": False,
                        "cumple": ind_3_1_meta["cumple"],
                        "estado_meta": ind_3_1_meta["estado_meta"],
                        "etiqueta_meta": ind_3_1_meta["etiqueta_meta"],
                        "estado": ind_3_1_meta["etiqueta_meta"],
                        "descripcion": "Coincidencia entre la estación con mayor temperatura crítica y el ángulo asignado al servomotor.",
                        "interpretacion": "La validación requiere registrar la zona de referencia junto con el resultado de cada orden."
                    },
                    {
                        "codigo": "IND-3.2",
                        "nombre": "Latencia de Control Simulado (ACK)",
                        "valor_numerico": lat_prom,
                        "valor": f"{lat_prom} ms" if lat_prom is not None else "Sin ACKs medidos",
                        "unidad": "ms",
                        "meta": "< 200 ms",
                        "tasa_ack_pct": tasa_ack,
                        "muestras": total_ev,
                        "disponible": lat_prom is not None,
                        "cumple": ind_3_2_meta["cumple"],
                        "estado_meta": ind_3_2_meta["estado_meta"],
                        "etiqueta_meta": ind_3_2_meta["etiqueta_meta"],
                        "estado": ind_3_2_meta["etiqueta_meta"],
                        "descripcion": "Tiempo real medido desde que FastAPI publica la orden hasta recibir el ACK correlacionado del simulador.",
                        "interpretacion": (
                            f"Latencia media medida de {lat_prom} ms con {tasa_ack}% de confirmaciones ACK recibidas."
                            if lat_prom is not None else "Emita una orden manual o automática para medir la latencia de confirmación."
                        )
                    }
                ]
            },
            "dimension_4_termica": {
                "titulo": "Dimensión 4: Efectividad Térmica y Eficiencia Energética",
                "indicadores": [
                    {
                        "codigo": "IND-4.1",
                        "nombre": "Variación Térmica en Zona Refrigerada (ΔT)",
                        "valor_numerico": delta_t,
                        "valor": f"{delta_t} °C" if delta_t is not None else "En recolección",
                        "unidad": "°C",
                        "meta": "Reducción > 2.0 °C",
                        "muestras": len(antes),
                        "disponible": delta_t is not None,
                        "cumple": ind_4_1_meta["cumple"],
                        "estado_meta": ind_4_1_meta["estado_meta"],
                        "etiqueta_meta": ind_4_1_meta["etiqueta_meta"],
                        "estado": ind_4_1_meta["etiqueta_meta"],
                        "descripcion": "Diferencia media entre la temperatura al emitir una orden de encendido y la lectura de la misma zona a los dos minutos.",
                        "interpretacion": "Comparación descriptiva de eventos simulados con ACK y lectura posterior."
                    },
                    {
                        "codigo": "IND-4.2",
                        "nombre": "Lecturas con Ventilador Simulado Activo",
                        "valor_numerico": duty_fan,
                        "valor": f"{duty_fan}%" if duty_fan is not None else "Sin lecturas",
                        "unidad": "%",
                        "meta": "< 50.0% (Uso eficiente)",
                        "muestras": total_msgs,
                        "disponible": duty_fan is not None,
                        "cumple": False,
                        "estado_meta": "sin_meta_definida",
                        "etiqueta_meta": "Requiere medición de tiempo",
                        "estado": "Requiere medición de tiempo",
                        "descripcion": "Fracción de registros simulados de la última hora con ventilador marcado como encendido.",
                        "interpretacion": "El consumo en Wh requiere medición eléctrica."
                    }
                ]
            }
        }

    # ================= CONSULTAS REALES PARA ESTADÍSTICA (SIN INVENTAR DATOS) =================

    def _obtener_pares_reales_enfriamiento(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Empareja órdenes de encendido confirmadas por el simulador con la primera lectura
        simulada de su zona entre 120 y 135 segundos después de la orden.
        """
        antes_list: List[float] = []
        despues_list: List[float] = []
        try:
            conn = db_manager.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT c.temperatura_disparo,
                       (SELECT r.temperatura_actual
                        FROM registro_termico r
                        WHERE r.zona = c.zona_objetivo AND r.origen = 'virtual'
                          AND r.timestamp BETWEEN FROM_UNIXTIME(c.timestamp_decision + 120)
                                              AND FROM_UNIXTIME(c.timestamp_decision + 135)
                        ORDER BY r.timestamp, r.id LIMIT 1) AS temp_posterior
                FROM control_eventos c
                WHERE c.fan_state = 1 AND c.estado_comando = 'EJECUTADO_SIMULACION'
                  AND c.timestamp_decision <= UNIX_TIMESTAMP() - 120
                ORDER BY c.id DESC
                LIMIT 30
            """)
            for f in cursor.fetchall():
                if f["temperatura_disparo"] is not None and f["temp_posterior"] is not None:
                    antes_list.append(float(f["temperatura_disparo"]))
                    despues_list.append(float(f["temp_posterior"]))

            cursor.close()
            conn.close()
        except Exception as e:
            logger.warning(f"Error consultando pares reales de enfriamiento: {e}")

        return np.array(antes_list, dtype=float), np.array(despues_list, dtype=float)

    def _obtener_muestras_latencia_reales(self) -> np.ndarray:
        """Obtiene únicamente las latencias realmente medidas en `control_eventos` (ack_recibido = 1)"""
        try:
            conn = db_manager.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT latencia_ms
                FROM control_eventos
                WHERE origen_ejecucion = 'simulacion'
                  AND ack_recibido = 1 AND latencia_ms IS NOT NULL AND latencia_ms > 0
                ORDER BY id DESC
                LIMIT 40
            """)
            filas = cursor.fetchall()
            cursor.close()
            conn.close()
            return np.array([float(f["latencia_ms"]) for f in filas], dtype=float)
        except Exception as e:
            logger.warning(f"Error obteniendo muestras de latencia: {e}")
            return np.array([], dtype=float)

    def _obtener_temperaturas_por_zonas_reales(self) -> Tuple[List[np.ndarray], Dict[str, int]]:
        """Obtiene los vectores de temperaturas registradas en BD por cada una de las 5 zonas"""
        grupos: List[np.ndarray] = []
        conteo: Dict[str, int] = {}
        try:
            conn = db_manager.get_connection()
            cursor = conn.cursor(dictionary=True)
            for z in ["zona1", "zona2", "zona3", "zona4", "zona5"]:
                cursor.execute(
                    "SELECT temperatura_actual FROM registro_termico WHERE origen = 'virtual' AND zona = %s ORDER BY id DESC LIMIT 30",
                    (z,)
                )
                filas = cursor.fetchall()
                arr = np.array([float(f["temperatura_actual"]) for f in filas if f["temperatura_actual"] is not None], dtype=float)
                conteo[z] = len(arr)
                grupos.append(arr)
            cursor.close()
            conn.close()
        except Exception as e:
            logger.warning(f"Error obteniendo temperaturas por zonas: {e}")
        return grupos, conteo

    def _obtener_residuos_ml_reales(self) -> np.ndarray:
        """Obtiene los residuos reales (y_real - y_pred) de los pares disponibles en la base de datos"""
        pares = db_manager.obtener_pares_para_metricas(zona="todas", ventana_segundos=600, tolerancia=60)
        if pares:
            return np.array([float(p[1] - p[0]) for p in pares], dtype=float)
        return np.array([], dtype=float)

statistics_service = StatisticsService()
