import { Platform } from "react-native";
import Constants from "expo-constants";
import {
  AlertaActiva,
  DimensionIndicador,
  EscenarioSimulacion,
  EstadoActualResponse,
  EstadoMetaIndicador,
  EventoControl,
  IndicadoresDetalladosResponse,
  IndicadoresResponse,
  ModoControl,
  PruebaEstadistica,
  PruebasEstadisticasResponse,
  ZonaEstado,
} from "../types/iot";

export function detectDefaultApiUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8000`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:8000`;
    }
  }

  return "http://192.168.0.23:8000";
}

/**
 * Evalúa rigurosamente si un indicador cumple su meta matemática real según el operador.
 * Estados:
 * - 'cumplida': Meta cumplida
 * - 'no_cumple': No cumple
 * - 'sin_datos_suficientes': Sin datos suficientes
 * - 'sin_meta_definida': Sin meta definida
 */
export function evaluarMetaIndicador(
  codigo: string,
  val: number | null,
  muestras: number = 0
): {
  cumple: boolean;
  estado_meta: EstadoMetaIndicador;
  etiqueta_meta: string;
  progreso_pct: number | null;
} {
  if (val === null || Number.isNaN(val)) {
    return {
      cumple: false,
      estado_meta: "sin_datos_suficientes",
      etiqueta_meta: "Sin datos suficientes",
      progreso_pct: null,
    };
  }

  const muestrasMinimas: Record<string, number> = {
    "IND-1.1": 2,
    "IND-1.2": 1,
    "IND-2.1": 3,
    "IND-2.2": 3,
    "IND-2.3": 3,
    "IND-3.1": 1,
    "IND-3.2": 1,
    "IND-4.1": 1,
    "IND-4.2": 1,
  };

  const minReq = muestrasMinimas[codigo] ?? 1;
  if (muestras > 0 && muestras < minReq) {
    return {
      cumple: false,
      estado_meta: "sin_datos_suficientes",
      etiqueta_meta: "Sin datos suficientes",
      progreso_pct: null,
    };
  }

  switch (codigo) {
    case "IND-1.1": {
      // Meta: 5.0 s (±0.5 s) -> 4.5 <= x <= 5.5
      const cumple = val >= 4.5 && val <= 5.5;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: null,
      };
    }
    case "IND-1.2": {
      // Meta: > 98.0%
      const cumple = val > 98.0;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: Math.max(0, Math.min(100, val)),
      };
    }
    case "IND-2.1": {
      // Meta: MAE < 0.80 °C (Si MAE es 2.3 °C o 10.1 °C, NO CUMPLE)
      const cumple = val < 0.80;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: null,
      };
    }
    case "IND-2.2": {
      // Meta: RMSE < 1.00 °C
      const cumple = val < 1.00;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: null,
      };
    }
    case "IND-2.3": {
      // Meta: R² > 0.85
      const cumple = val > 0.85;
      const pct = val > 0 ? Math.min(100, Math.round(val * 100)) : 0;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: pct,
      };
    }
    case "IND-3.1": {
      // Meta: Exactitud 100%
      const cumple = val >= 99.9;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: Math.max(0, Math.min(100, val)),
      };
    }
    case "IND-3.2": {
      // Meta: Latencia < 200 ms
      const cumple = val > 0 && val < 200.0;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: null,
      };
    }
    case "IND-4.1": {
      // Meta: Reducción térmica ΔT > 2.0 °C
      const cumple = val > 2.0;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: null,
      };
    }
    case "IND-4.2": {
      // Meta: Duty Cycle < 50.0%
      const cumple = val < 50.0;
      return {
        cumple,
        estado_meta: cumple ? "cumplida" : "no_cumple",
        etiqueta_meta: cumple ? "Meta cumplida" : "No cumple",
        progreso_pct: Math.max(0, Math.min(100, val)),
      };
    }
    default:
      return {
        cumple: false,
        estado_meta: "sin_meta_definida",
        etiqueta_meta: "Sin meta definida",
        progreso_pct: null,
      };
  }
}

export async function fetchMobileDashboardBundle(apiUrl: string) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");

  const [
    resControlEstado,
    resActual,
    resHist,
    resInd,
    resIndDet,
    resStat,
    resEv,
    resAlertas,
  ] = await Promise.all([
    fetch(`${cleanUrl}/api/control/estado`),
    fetch(`${cleanUrl}/api/telemetria/actual`),
    fetch(`${cleanUrl}/api/telemetria/historial?limit=80`),
    fetch(`${cleanUrl}/api/indicadores`),
    fetch(`${cleanUrl}/api/indicadores/detallado`),
    fetch(`${cleanUrl}/api/estadisticas/pruebas`),
    fetch(`${cleanUrl}/api/control/eventos?limit=30`),
    fetch(`${cleanUrl}/api/alertas`),
  ]);

  if (!resControlEstado.ok && !resActual.ok) {
    throw new Error(`Error conectando con ${cleanUrl}`);
  }

  const rawControlEstado = resControlEstado.ok
    ? await resControlEstado.json()
    : {};
  const rawActual = resActual.ok ? await resActual.json() : [];
  const rawHist = resHist.ok ? await resHist.json() : { datos: [] };
  const rawInd = resInd.ok ? await resInd.json() : {};
  const rawIndDet = resIndDet.ok ? await resIndDet.json() : {};
  const rawStat = resStat.ok ? await resStat.json() : {};
  const rawEv = resEv.ok ? await resEv.json() : [];
  const rawAlertasJson = resAlertas.ok
    ? await resAlertas.json()
    : { alertas: [] };

  const sys = rawControlEstado?.sistema || {};
  const zonasArr: any[] = Array.isArray(rawControlEstado?.zonas)
    ? rawControlEstado.zonas
    : Array.isArray(rawActual)
    ? rawActual
    : [];

  const zonasMap: Record<string, ZonaEstado> = {};
  for (const z of zonasArr) {
    const zId = z.zona || "zona1";
    const tAct =
      z.temperatura_actual != null ? Number(z.temperatura_actual) : 25.0;
    const tPred =
      z.temperatura_predicha != null ? Number(z.temperatura_predicha) : tAct;
    zonasMap[zId] = {
      temperatura: tAct,
      humedad: 52.0,
      prediccion_10m: tPred,
      alerta_preventiva: tPred >= 35.0,
      angulo_servo: z.angulo_servo_zona ?? z.angulo_servo ?? 0,
      nombre: z.nombre || zId.toUpperCase(),
      sensor: z.sensor || "Sonda Virtual (Simulado)",
      origen_datos: "Simulado",
      modo_operacion: "simulacion",
      escenario_simulacion: (sys.escenario_simulacion ||
        "demostracion") as EscenarioSimulacion,
      disponible: z.disponible !== false && z.temperatura_actual !== null,
      nivel_termico: (z.nivel_termico || "normal") as any,
      ultima_actualizacion: z.timestamp || null,
    };
  }

  const alertasNorm: AlertaActiva[] = (rawAlertasJson.alertas || []).map(
    (a: any) => ({
      id: a.id,
      zona_id: a.zona || "zona1",
      estacion: a.nombre_zona || a.zona || "PC",
      severidad:
        a.severidad === "critica"
          ? "CRITICA"
          : a.severidad === "error"
          ? "FALLO_SENSOR"
          : "ADVERTENCIA",
      tipo: a.tipo || "ADVERTENCIA",
      mensaje: a.mensaje || a.titulo || "",
      temperatura: a.temperatura_actual ?? null,
      prediccion_10m: a.temperatura_predicha ?? null,
      timestamp: a.hora || "",
      modo_operacion: "simulacion",
    })
  );

  const dim1 = rawInd?.dimension_1 || {};
  const dim2 = rawInd?.dimension_2 || {};
  const dim3 = rawInd?.dimension_3 || {};
  const dim4 = rawInd?.dimension_4 || {};
  const duty = Number(dim4.fraccion_tiempo_fan_pct ?? 20.0);

  const estadoActual: EstadoActualResponse = {
    modo_operacion: sys.modo_operacion_sistema || "simulacion",
    escenario_simulacion: (sys.escenario_simulacion ||
      "demostracion") as EscenarioSimulacion,
    modo_control: (sys.modo_control || "autonomo") as ModoControl,
    zonas: zonasMap,
    ventilador_activo: Number(sys.estado_ventilador) === 1,
    ultimo_angulo_servo: Number(sys.angulo_servo ?? 90),
    zona_objetivo_actual: sys.zona_activa || "zona3",
    ultima_accion: sys.ultimo_estado_comando || "EN_ESPERA",
    mqtt_conectado: Boolean(rawControlEstado?.broker_conectado ?? true),
    mensajes_procesados: Number(sys.total_mensajes_recibidos ?? 0),
    comandos_enviados: Number(dim3.total_eventos ?? 0),
    acks_recibidos: Number(sys.total_acks_recibidos ?? 0),
    latencia_ultima_ms:
      sys.ultima_latencia_ms != null
        ? Number(sys.ultima_latencia_ms)
        : dim3.latencia_promedio_ms ?? null,
    metricas_ml: {
      r2_score: dim2.r2 ?? null,
      mae: dim2.mae ?? null,
      rmse: dim2.rmse ?? null,
      muestras_evaluadas: Number(dim2.muestras ?? 0),
    },
    alertas_activas: alertasNorm,
  };

  const indicadores: IndicadoresResponse = {
    modo_operacion: "simulacion",
    advertencia_metodologica:
      "Indicadores calculados en modo simulación.",
    total_lecturas: Number(dim1.total_mensajes ?? 0),
    temperatura_media_global: Number(sys.temperatura_promedio ?? 30.5),
    temperatura_maxima_global: Number(sys.temperatura_maxima_detectada ?? 34.0),
    reduccion_termica_promedio_c: Number(dim4.delta_termico_c ?? 0.0),
    eventos_enfriamiento_completados: Number(dim3.total_eventos ?? 0),
    eventos_preventivos_ia: Number(dim3.total_eventos ?? 0),
    eventos_reactivos_umbral: 0,
    eventos_manuales: 0,
    total_activaciones: Number(dim3.total_eventos ?? 0),
    latencia_red_promedio_ms: dim3.latencia_promedio_ms ?? null,
    acks_confirmados: Number(sys.total_acks_recibidos ?? 0),
    tasa_confirmacion_ack_pct: dim3.tasa_ack_pct ?? null,
    ahorro_energetico_estimado_pct: Math.max(
      0,
      Number((100 - duty).toFixed(1))
    ),
    consumo_inteligente_wh: Number(((duty / 100) * 1.5).toFixed(2)),
    consumo_continuo_base_wh: 7.5,
    precision_modelo_r2: dim2.r2 ?? null,
    error_absoluto_medio_mae: dim2.mae ?? null,
    rmse_modelo: dim2.rmse ?? null,
    muestras_ml: Number(dim2.muestras ?? 0),
  };

  const keys = [
    {
      key: "dimension_1_transmision",
      id: "DIM-01",
      shortLabel: "Transmisión",
      varName: "Transmisión y Arquitectura IoT",
    },
    {
      key: "dimension_2_ml",
      id: "DIM-02",
      shortLabel: "Predicción IA",
      varName: "Precisión Predictiva (Scikit-Learn)",
    },
    {
      key: "dimension_3_control",
      id: "DIM-03",
      shortLabel: "Control",
      varName: "Respuesta de Control y Actuación",
    },
    {
      key: "dimension_4_termica",
      id: "DIM-04",
      shortLabel: "Térmica",
      varName: "Efectividad Térmica y Energía",
    },
  ];

  const dimensiones: DimensionIndicador[] = keys
    .map((k) => {
      const block = rawIndDet?.[k.key];
      if (!block) return null;
      return {
        id: k.id,
        shortLabel: k.shortLabel,
        dimension: k.varName,
        variable: k.shortLabel,
        icono: "activity",
        indicadores: (block.indicadores || []).map((ind: any) => {
          const valNum =
            ind.valor_numerico != null ? Number(ind.valor_numerico) : null;
          const evalMeta = evaluarMetaIndicador(
            ind.codigo,
            valNum,
            Number(ind.muestras ?? 0)
          );
          return {
            codigo: ind.codigo,
            indicador: ind.nombre,
            valor: valNum,
            unidad: ind.unidad === "adimensional" ? "" : ind.unidad || "",
            meta: ind.meta || "",
            cumplimiento: evalMeta.cumple,
            estado_meta: evalMeta.estado_meta,
            etiqueta_meta: evalMeta.etiqueta_meta,
            progreso_pct: evalMeta.progreso_pct,
            muestras: ind.muestras ?? 0,
            descripcion: ind.descripcion || "",
            interpretacion: ind.interpretacion || "",
          };
        }),
      };
    })
    .filter(Boolean) as DimensionIndicador[];

  const indicadoresDetallados: IndicadoresDetalladosResponse = {
    modo_operacion: "simulacion",
    advertencia_metodologica:
      rawIndDet?.etiqueta_origen || "Resultados en modo simulación.",
    resumen_global: indicadores,
    dimensiones,
  };

  const pMap = rawStat?.pruebas || {};
  const listRaw = [
    {
      id: "STAT-01",
      shortName: "t de Student pareada",
      data: pMap.t_student_enfriamiento,
      statName: "t",
    },
    {
      id: "STAT-02",
      shortName: "t de una muestra",
      data: pMap.t_student_latencia,
      statName: "t",
    },
    {
      id: "STAT-03",
      shortName: "ANOVA de un factor",
      data: pMap.anova_zonas,
      statName: "F",
    },
    {
      id: "STAT-04",
      shortName: "Shapiro-Wilk",
      data: pMap.normalidad_residuos,
      statName: "W",
    },
  ];

  const pruebas: PruebaEstadistica[] = listRaw
    .filter((item) => item.data)
    .map((item) => {
      const d = item.data;
      const statVal =
        d.estadistico_t ?? d.estadistico_f ?? d.estadistico_w ?? null;
      const suficiente = Boolean(d.suficiente);
      const pVal = d.p_valor != null ? Number(d.p_valor) : null;

      let resultadoBreve = "Muestra insuficiente";
      let esFavorable = false;

      if (suficiente) {
        if (item.id === "STAT-04") {
          esFavorable = Boolean(d.es_normal);
          resultadoBreve = esFavorable
            ? "Distribución normal"
            : "Desviación de normalidad";
        } else {
          esFavorable = Boolean(d.es_significativo);
          resultadoBreve = esFavorable
            ? "Diferencia significativa"
            : "Sin evidencia significativa";
        }
      }

      return {
        id: item.id,
        nombre_corto: item.shortName,
        nombre_prueba: d.nombre,
        variable_evaluada: d.variable,
        hipotesis_nula_h0: d.hipotesis_nula,
        hipotesis_alternativa_h1: d.hipotesis_alternativa,
        estadistico_nombre: item.statName,
        estadistico_valor: statVal != null ? Number(statVal) : null,
        p_valor: pVal,
        nivel_significancia_alfa: 0.05,
        n_muestras: Number(d.n_muestras ?? 0),
        minimo_requerido: Number(d.n_minimo_recomendado ?? 3),
        suficiente,
        estado_evaluacion: d.estado_muestra || "SUFICIENTE",
        resultado_breve: resultadoBreve,
        es_favorable: esFavorable,
        media_pre_enfriamiento_c: d.media_antes_c ?? null,
        media_post_enfriamiento_c: d.media_despues_c ?? null,
        reduccion_media_c: d.reduccion_media_c ?? null,
        latencia_media_ms: d.media_latencia_ms ?? null,
        rechaza_h0: Boolean(d.es_significativo),
        supuesto_normalidad_cumplido: Boolean(d.es_normal),
        modo_operacion: "simulacion",
        conclusion: d.conclusion || "",
      };
    });

  const pruebasEstadisticas: PruebasEstadisticasResponse = {
    modo_operacion: "simulacion",
    advertencia_metodologica:
      rawStat?.aviso_metodologico ||
      "Resultados calculados sobre datos de simulación.",
    fecha_generacion: new Date().toISOString(),
    software_estadistico: "SciPy.stats",
    nivel_confianza: "95%",
    resumen_ejecutivo: {
      total_pruebas: pruebas.length,
      pruebas_con_muestra_suficiente: pruebas.filter((p) => p.suficiente)
        .length,
      hipotesis_validadas: pruebas.filter((p) => p.es_favorable).length,
      validez_inferencial: "Simulación",
    },
    pruebas,
  };

  const historialNorm = (rawHist.datos || []).map((h: any) => ({
    ...h,
    temperatura: Number(h.temperatura_actual ?? h.temperatura ?? 25.0),
    prediccion_10m: Number(
      h.temperatura_predicha ?? h.prediccion_10m ?? 25.0
    ),
    fecha_registro: h.timestamp || h.fecha_registro,
  }));

  const evArray = Array.isArray(rawEv) ? rawEv : rawEv.eventos || [];
  const eventosNorm: EventoControl[] = evArray.map((e: any) => ({
    id: e.id,
    comando_id: e.comando_id || null,
    zona_objetivo: e.zona_objetivo || "zona1",
    angulo_servo: Number(e.servo_angle ?? e.angulo_servo ?? 90),
    estado_ventilador: Number(e.fan_state ?? e.estado_ventilador ?? 0) === 1,
    motivo: e.modo_operacion === "manual" ? "Manual" : "Automático",
    temperatura_disparo: Number(e.temperatura_disparo ?? 32.0),
    temperatura_posterior:
      e.temperatura_predicha != null ? Number(e.temperatura_predicha) : null,
    reduccion_c: null,
    latencia_ms: e.latencia_ms != null ? Number(e.latencia_ms) : null,
    confirmado_ack: Number(e.ack_recibido ?? e.confirmado_ack ?? 0) === 1,
    modo_operacion: e.modo_operacion || "simulacion",
    estado_comando:
      e.estado_comando ||
      (Number(e.ack_recibido) === 1 ? "EJECUTADO_SIMULACION" : "PENDIENTE"),
    origen_ejecucion: e.origen_ejecucion || "simulacion",
    fecha_evento: e.timestamp || "",
  }));

  return {
    estadoActual,
    historial: historialNorm,
    indicadores,
    indicadoresDetallados,
    pruebasEstadisticas,
    eventos: eventosNorm,
    alertas: alertasNorm,
  };
}

export async function fetchDetalleZonaMobile(apiUrl: string, zonaId: string) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/telemetria/zona/${zonaId}?limit=30`);
  if (!res.ok) throw new Error("Error al consultar estación");
  const data = await res.json();
  return {
    ...data,
    historial: (data.historial || []).map((h: any) => ({
      ...h,
      temperatura: Number(h.temperatura_actual ?? h.temperatura ?? 25.0),
      prediccion_10m: Number(
        h.temperatura_predicha ?? h.prediccion_10m ?? 25.0
      ),
      fecha_registro: h.timestamp || h.fecha_registro,
    })),
    eventos_recientes: (data.eventos_recientes || []).map((e: any) => ({
      ...e,
      angulo_servo: Number(e.servo_angle ?? e.angulo_servo ?? 90),
      motivo: e.modo_operacion === "manual" ? "Manual" : "Automático",
      confirmado_ack: Number(e.ack_recibido ?? 0) === 1,
    })),
  };
}

export async function cambiarModoControlMobile(
  apiUrl: string,
  modo: ModoControl
) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/control/modo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modo }),
  });
  if (!res.ok) throw new Error("Error al cambiar modo de control");
  return res.json();
}

export async function enviarComandoManualMobile(
  apiUrl: string,
  payload: {
    zona: string;
    ventilador_activo: boolean;
    angulo_servo?: number;
    motivo?: string;
  }
) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/control/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      zona: payload.zona,
      fan_state: payload.ventilador_activo ? 1 : 0,
      servo_angle: payload.angulo_servo,
    }),
  });
  if (!res.ok) throw new Error("Error al enviar comando manual");
  return res.json();
}

export async function cambiarEscenarioMobile(
  apiUrl: string,
  escenario: EscenarioSimulacion
) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/simulacion/escenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ escenario }),
  });
  if (!res.ok) throw new Error("Error al cambiar escenario");
  return res.json();
}

export async function reiniciarSimulacionMobile(apiUrl: string) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/simulacion/reiniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Error al reiniciar simulación");
  return res.json();
}

export async function testBackendHealthMobile(apiUrl: string) {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
