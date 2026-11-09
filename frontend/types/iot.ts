export type EscenarioSimulacion =
  | "normal"
  | "sobrecalentamiento"
  | "carga_extrema"
  | "demostracion"
  | "fallo_sensor";

export type ModoControl = "autonomo" | "manual";

export interface ZonaEstado {
  temperatura: number;
  humedad: number;
  prediccion_10m: number;
  tendencia_por_minuto?: number;
  alerta_preventiva?: boolean;
  probabilidad_sobrecalentamiento?: number;
  angulo_servo: number;
  nombre: string;
  sensor: string;
  tipo_sensor?: string;
  origen_datos?: string;
  modo_operacion?: string;
  escenario_simulacion?: EscenarioSimulacion;
  disponible: boolean;
  segundos_sin_reporte?: number | null;
  nivel_termico: "normal" | "advertencia" | "critico" | "sin_senal";
  ultima_actualizacion: string | null;
}

export interface EstadoActualResponse {
  modo_operacion: string;
  escenario_simulacion: EscenarioSimulacion;
  modo_control: ModoControl;
  zonas: Record<string, ZonaEstado>;
  ventilador_activo: boolean;
  ultimo_angulo_servo: number;
  zona_objetivo_actual: string;
  ultima_accion: string;
  mqtt_conectado: boolean;
  mensajes_procesados: number;
  comandos_enviados: number;
  acks_recibidos: number;
  latencia_ultima_ms: number | null;
  metricas_ml: {
    r2_score: number | null;
    mae: number | null;
    rmse: number | null;
    muestras_evaluadas: number;
    estado_modelo?: string;
  };
  alertas_activas?: AlertaActiva[];
  estado_simulador?: Record<string, any>;
}

export interface AlertaActiva {
  id: string;
  zona_id: string;
  estacion: string;
  severidad: "CRITICA" | "ADVERTENCIA" | "FALLO_SENSOR";
  tipo: string;
  mensaje: string;
  temperatura: number | null;
  prediccion_10m?: number;
  timestamp: string;
  modo_operacion: string;
}

export interface IndicadoresResponse {
  modo_operacion: string;
  advertencia_metodologica: string;
  total_lecturas: number;
  temperatura_media_global: number;
  temperatura_maxima_global: number;
  reduccion_termica_promedio_c: number;
  eventos_enfriamiento_completados: number;
  eventos_preventivos_ia: number;
  eventos_reactivos_umbral: number;
  eventos_manuales: number;
  total_activaciones: number;
  latencia_red_promedio_ms: number | null;
  acks_confirmados: number;
  tasa_confirmacion_ack_pct: number | null;
  ahorro_energetico_estimado_pct: number;
  consumo_inteligente_wh: number;
  consumo_continuo_base_wh: number;
  precision_modelo_r2: number | null;
  error_absoluto_medio_mae: number | null;
  rmse_modelo: number | null;
  muestras_ml: number;
}

export type EstadoMetaIndicador =
  | "cumplida"
  | "no_cumple"
  | "sin_datos_suficientes"
  | "sin_meta_definida";

export interface IndicadorItem {
  codigo: string;
  indicador: string;
  valor: number | null;
  unidad: string;
  meta: string;
  cumplimiento: boolean;
  estado_meta: EstadoMetaIndicador;
  etiqueta_meta: string;
  progreso_pct: number | null;
  muestras?: number;
  descripcion?: string;
  interpretacion: string;
}

export interface DimensionIndicador {
  id: string;
  dimension: string;
  variable: string;
  icono: string;
  indicadores: IndicadorItem[];
}

export interface IndicadoresDetalladosResponse {
  modo_operacion: string;
  advertencia_metodologica: string;
  resumen_global: IndicadoresResponse;
  dimensiones: DimensionIndicador[];
}

export interface PruebaEstadistica {
  id: string;
  nombre_corto: string;
  nombre_prueba: string;
  variable_evaluada: string;
  hipotesis_nula_h0: string;
  hipotesis_alternativa_h1: string;
  estadistico_nombre: string;
  estadistico_valor: number | null;
  p_valor: number | null;
  nivel_significancia_alfa: number;
  gl?: number;
  n_muestras: number;
  minimo_requerido: number;
  suficiente: boolean;
  estado_evaluacion: "SUFICIENTE" | "MUESTRAS_INSUFICIENTES" | "VARIANZA_CERO" | "ERROR";
  resultado_breve: string;
  es_favorable: boolean;
  media_pre_enfriamiento_c?: number | null;
  media_post_enfriamiento_c?: number | null;
  reduccion_media_c?: number | null;
  latencia_media_ms?: number | null;
  medias_por_zona_c?: Record<string, number>;
  rechaza_h0?: boolean | null;
  supuesto_normalidad_cumplido?: boolean | null;
  modo_operacion: string;
  conclusion: string;
}

export interface PruebasEstadisticasResponse {
  modo_operacion: string;
  advertencia_metodologica: string;
  fecha_generacion: string;
  software_estadistico: string;
  nivel_confianza: string;
  resumen_ejecutivo: {
    total_pruebas: number;
    pruebas_con_muestra_suficiente: number;
    hipotesis_validadas: number;
    validez_inferencial: string;
  };
  pruebas: PruebaEstadistica[];
}

export interface EventoControl {
  id: number;
  comando_id?: string | null;
  zona_objetivo: string;
  angulo_servo: number;
  estado_ventilador: boolean | number;
  motivo: string;
  temperatura_disparo: number;
  temperatura_posterior: number | null;
  reduccion_c: number | null;
  latencia_ms: number | null;
  confirmado_ack: boolean | number;
  modo_operacion?: string;
  estado_comando?: "PENDIENTE" | "EJECUTADO_SIMULACION" | "EJECUTADO_HARDWARE" | "TIMEOUT" | "ERROR";
  origen_ejecucion?: string;
  fecha_evento: string;
}
