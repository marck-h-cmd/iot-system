import {
  AlertaActiva,
  DimensionIndicador,
  EscenarioSimulacion,
  ConfirmacionNano,
  EvaluacionModelo,
  EvidenciaHistorica,
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

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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

function normalizeEstadoActual(
  rawControlEstado: any,
  rawAlertas: any[]
): EstadoActualResponse {
  const sys = rawControlEstado?.sistema || {};
  const zonasArr: any[] = Array.isArray(rawControlEstado?.zonas)
    ? rawControlEstado.zonas
    : [];

  const zonasMap: Record<string, ZonaEstado> = {};
  for (const z of zonasArr) {
    const zId = z.zona || "zona1";
    const tAct = z.temperatura_actual != null ? Number(z.temperatura_actual) : null;
    const tPred = z.temperatura_predicha != null ? Number(z.temperatura_predicha) : null;
    const orig = (z.origen || "virtual") as "real" | "virtual" | "sin_sensor";
    const origLabel =
      orig === "real"
        ? "REAL"
        : orig === "sin_sensor"
        ? "SIN SENSOR FÍSICO"
        : "SIMULADA";
    zonasMap[zId] = {
      temperatura: tAct,
      humedad: z.humedad != null ? Number(z.humedad) : null,
      prediccion_10m: tPred,
      alerta_preventiva: tPred != null && tPred >= 35.0,
      angulo_servo: z.angulo_servo_zona ?? z.angulo_servo ?? 0,
      nombre: z.nombre || zId.toUpperCase(),
      sensor: z.sensor || "Sonda Virtual (Simulado)",
      origen: orig,
      origen_datos: origLabel,
      estado_telemetria: z.estado_telemetria || (orig === "real" ? "ACTUAL" : "SIMULADA"),
      edad_trama_s: z.edad_trama_s ?? -1,
      ultima_temperatura_valida: z.ultima_temperatura_valida ?? null,
      modo_operacion: sys.modo_operacion_sistema || "simulacion",
      escenario_simulacion: (sys.escenario_simulacion || "demostracion") as EscenarioSimulacion,
      disponible: z.disponible !== false && z.temperatura_actual !== null,
      nivel_termico: (z.nivel_termico || "normal") as any,
      ultima_actualizacion: z.timestamp || null,
    };
  }

  const hwEsp32 = rawControlEstado?.hardware_esp32 || sys.hardware_esp32 || undefined;
  return {
    modo_operacion: sys.modo_operacion_sistema || "simulacion",
    escenario_simulacion: (sys.escenario_simulacion || "demostracion") as EscenarioSimulacion,
    modo_control: (sys.modo_control || "autonomo") as ModoControl,
    zonas: zonasMap,
    ventilador_activo: Number(sys.estado_ventilador) === 1,
    ultimo_angulo_servo: Number(sys.angulo_servo ?? 90),
    zona_objetivo_actual: sys.zona_activa || "zona3",
    ultima_accion: sys.ultimo_estado_comando || "EN_ESPERA",
    mqtt_conectado: Boolean(rawControlEstado?.broker_conectado),
    mensajes_procesados: Number(sys.total_mensajes_recibidos ?? 0),
    comandos_enviados: Number(sys.total_comandos_enviados ?? 0),
    acks_recibidos: Number(sys.total_acks_recibidos ?? 0),
    latencia_ultima_ms:
      sys.ultima_latencia_ms != null
        ? Number(sys.ultima_latencia_ms)
        : null,
    hardware_esp32: hwEsp32,
    metricas_ml: {
      r2_score: null,
      mae: null,
      rmse: null,
      muestras_evaluadas: 0,
    },
    alertas_activas: rawAlertas,
  };
}

function normalizeIndicadores(rawInd: any): IndicadoresResponse {
  const d1 = rawInd?.dimension_1 || {};
  const d2 = rawInd?.dimension_2 || {};
  const d3 = rawInd?.dimension_3 || {};
  const d4 = rawInd?.dimension_4 || {};
  const est = rawInd?.estado_actual || {};

  return {
    modo_operacion: "simulacion",
    advertencia_metodologica:
      "Métricas calculadas en tiempo real sobre telemetría y eventos del simulador.",
    total_lecturas: Number(d1.total_mensajes ?? 0),
    temperatura_media_global: Number(est.temperatura_promedio ?? 30.5),
    temperatura_maxima_global: Number(est.temperatura_maxima_detectada ?? 34.0),
    reduccion_termica_promedio_c: Number(d4.delta_termico_c ?? 0.0),
    eventos_enfriamiento_completados: Number(d3.total_eventos ?? 0),
    eventos_preventivos_ia: Number(d3.total_eventos ?? 0),
    eventos_reactivos_umbral: 0,
    eventos_manuales: 0,
    total_activaciones: Number(d3.total_eventos ?? 0),
    latencia_red_promedio_ms: d3.latencia_promedio_ms ?? null,
    acks_confirmados: Number(est.total_acks_recibidos ?? 0),
    tasa_confirmacion_ack_pct: d3.tasa_ack_pct ?? null,
    precision_modelo_r2: d2.r2 ?? null,
    error_absoluto_medio_mae: d2.mae ?? null,
    rmse_modelo: d2.rmse ?? null,
    muestras_ml: Number(d2.muestras ?? 0),
  };
}

function normalizeIndicadoresDetallados(
  rawDet: any,
  resumenNorm: IndicadoresResponse
): IndicadoresDetalladosResponse {
  const keys = [
    { key: "dimension_1_transmision", id: "Dimensión 1", shortTitle: "Transmisión y Arquitectura IoT" },
    { key: "dimension_2_ml", id: "Dimensión 2", shortTitle: "Precisión Predictiva (Scikit-Learn)" },
    { key: "dimension_3_control", id: "Dimensión 3", shortTitle: "Respuesta de Control y Actuación" },
    { key: "dimension_4_termica", id: "Dimensión 4", shortTitle: "Efectividad Térmica y Energía" },
  ];

  const dimensiones: DimensionIndicador[] = keys
    .map((k) => {
      const block = rawDet?.[k.key];
      if (!block) return null;
      return {
        id: k.id,
        dimension: k.shortTitle,
        variable: k.id,
        icono: "activity",
        indicadores: (block.indicadores || []).map((ind: any) => {
          const valNum = ind.valor_numerico != null ? Number(ind.valor_numerico) : null;
          const evalMeta = evaluarMetaIndicador(ind.codigo, valNum, Number(ind.muestras ?? 0));
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

  return {
    modo_operacion: rawDet?.modo_operacion || "simulacion",
    advertencia_metodologica:
      rawDet?.etiqueta_origen || "Resultados calculados en modo simulación.",
    resumen_global: resumenNorm,
    dimensiones,
  };
}

function normalizeEstadisticas(rawStat: any): PruebasEstadisticasResponse {
  const pMap = rawStat?.pruebas || {};
  const listRaw = [
    {
      id: "STAT-01",
      shortName: "t de Student pareada",
      data: pMap.t_student_enfriamiento,
      statName: "Estadístico t",
    },
    {
      id: "STAT-02",
      shortName: "t de una muestra",
      data: pMap.t_student_latencia,
      statName: "Estadístico t",
    },
    {
      id: "STAT-03",
      shortName: "ANOVA de un factor",
      data: pMap.anova_zonas,
      statName: "Estadístico F",
    },
    {
      id: "STAT-04",
      shortName: "Shapiro-Wilk",
      data: pMap.normalidad_residuos,
      statName: "Estadístico W",
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
            ? "Distribución normal (p ≥ 0.05)"
            : "Desviación de normalidad (p < 0.05)";
        } else {
          esFavorable = Boolean(d.es_significativo);
          resultadoBreve = esFavorable
            ? "Diferencia significativa (p < 0.05)"
            : "Sin evidencia significativa (p ≥ 0.05)";
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

  const suficientesCount = pruebas.filter((p) => p.suficiente).length;

  return {
    modo_operacion: rawStat?.modo_operacion || "simulacion",
    advertencia_metodologica:
      rawStat?.aviso_metodologico ||
      "Resultados calculados sobre datos de simulación.",
    fecha_generacion: new Date().toISOString(),
    software_estadistico: "SciPy.stats",
    nivel_confianza: "95% (α = 0.05)",
    resumen_ejecutivo: {
      total_pruebas: pruebas.length,
      pruebas_con_muestra_suficiente: suficientesCount,
      hipotesis_validadas: pruebas.filter((p) => p.es_favorable).length,
      validez_inferencial: "Simulación",
    },
    pruebas,
  };
}

async function getJson<T = any>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Error de API (${response.status})`);
  return response.json();
}

function normalizeHistorial(filas: any[]) {
  return filas.map((h) => ({
    ...h,
    temperatura: Number(h.temperatura_actual),
    prediccion_10m: h.temperatura_predicha == null ? null : Number(h.temperatura_predicha),
    fecha_registro: Number(h.timestamp_origen) > 0 ? Number(h.timestamp_origen) * 1000 : h.timestamp,
  }));
}

export async function fetchDashboardBundle(signal?: AbortSignal) {
  const [rawControlEstado, real, virtual, rawEv, rawAlertasJson] = await Promise.all([
    getJson("/api/control/estado", signal),
    getJson("/api/telemetria/historial?limit=100&origen=real", signal),
    getJson("/api/telemetria/historial?limit=150&origen=virtual", signal),
    getJson("/api/control/eventos?limit=30", signal),
    getJson("/api/alertas", signal),
  ]);

  const alertasNorm: AlertaActiva[] = (rawAlertasJson.alertas || []).map((a: any) => ({
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
    modo_operacion: a.origen === "real" ? "real" : "simulacion",
  }));

  const estadoActual = normalizeEstadoActual(rawControlEstado, alertasNorm);
  const historialNorm = normalizeHistorial([...real.datos, ...virtual.datos]);

  const evArray = Array.isArray(rawEv) ? rawEv : rawEv.eventos || [];
  const eventosNorm: EventoControl[] = evArray.map((e: any) => ({
    id: e.id,
    comando_id: e.comando_id || null,
    zona_objetivo: e.zona_objetivo || "zona1",
    angulo_servo: Number(e.servo_angle ?? e.angulo_servo ?? 90),
    estado_ventilador: Number(e.fan_state ?? e.estado_ventilador ?? 0) === 1,
    motivo: e.modo_operacion === "manual" ? "Manual" : "Automático",
    temperatura_disparo: Number(e.temperatura_disparo ?? 32.0),
    temperatura_posterior: null,
    reduccion_c: null,
    latencia_ms: e.latencia_ms != null ? Number(e.latencia_ms) : null,
    confirmado_ack: Number(e.ack_recibido ?? e.confirmado_ack ?? 0) === 1,
    modo_operacion: e.modo_operacion || "simulacion",
    estado_comando:
      e.estado_comando ||
      (Number(e.ack_recibido) === 1 ? "EJECUTADO_SIMULACION" : "PENDIENTE"),
    origen_ejecucion: e.origen_ejecucion || "simulacion",
    fecha_evento: e.created_at || e.timestamp || "",
  }));

  return {
    estadoActual,
    historial: historialNorm,
    eventos: eventosNorm,
    alertas: alertasNorm,
  };
}

export async function fetchIndicadores(signal?: AbortSignal) {
  const [raw, detalle, real, virtual] = await Promise.all([
    getJson("/api/indicadores", signal),
    getJson("/api/indicadores/detallado", signal),
    getJson<EvaluacionModelo>("/api/metricas?origen=real", signal),
    getJson<EvaluacionModelo>("/api/metricas?origen=virtual", signal),
  ]);
  const indicadores = normalizeIndicadores(raw);
  return { indicadores, detalle: normalizeIndicadoresDetallados(detalle, indicadores), modelos: [real, virtual] };
}

export async function fetchEstadisticas(signal?: AbortSignal) {
  const [pruebas, evidencia] = await Promise.all([
    getJson("/api/estadisticas/pruebas", signal),
    getJson<EvidenciaHistorica>("/api/estadisticas/evidencia", signal),
  ]);
  return { pruebas: normalizeEstadisticas(pruebas), evidencia };
}

export async function cambiarModoControlApi(modo: ModoControl) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/control/modo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modo }),
  });
  if (!res.ok) throw new Error("Error al cambiar modo de control");
  return res.json();
}

export async function enviarOrdenNano(
  orden: { modo: "autonomo" | "pausa" } | { modo: "manual"; ventilador: boolean; angulo: number }
): Promise<ConfirmacionNano> {
  const res = await fetch(`${getApiBaseUrl()}/api/hardware/actuacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orden),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Orden física rechazada.");
  return body;
}

export async function enviarComandoManualApi(payload: {
  zona: string;
  ventilador_activo: boolean;
  angulo_servo?: number;
  motivo?: string;
}) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/control/manual`, {
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

export async function cambiarEscenarioSimulacionApi(
  escenario: EscenarioSimulacion
) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/simulacion/escenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ escenario }),
  });
  if (!res.ok) throw new Error("Error al cambiar escenario de simulación");
  return res.json();
}

export async function reiniciarSimulacionApi() {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/simulacion/reiniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Error al reiniciar simulación");
  return res.json();
}

export async function cambiarModoOperacionSistemaApi(
  modo: "simulacion" | "real" | "hibrido"
) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/sistema/modo-operacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modo }),
  });
  if (!res.ok) throw new Error("Error al cambiar modo de operación del sistema");
  return res.json();
}

export async function actualizarConfiguracionHardwareApi(payload: {
  esp32_url?: string;
  poll_interval_s?: number;
  mapping_ds18b20?: string;
  mapping_dht11?: string;
}) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/hardware/configuracion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error al actualizar configuración de hardware ESP32");
  return res.json();
}

export async function fetchDetalleZonaApi(zonaId: string, limite = 40) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/telemetria/zona/${zonaId}?limit=${limite}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`Error al obtener detalle de ${zonaId}`);
  const data = await res.json();
  return {
    ...data,
    historial: normalizeHistorial(data.historial || []),
    eventos_recientes: (data.eventos_recientes || []).map((e: any) => ({
      ...e,
      angulo_servo: Number(e.servo_angle ?? e.angulo_servo ?? 90),
      motivo: e.modo_operacion === "manual" ? "Manual" : "Automático",
      confirmado_ack: Number(e.ack_recibido ?? 0) === 1,
    })),
  };
}
