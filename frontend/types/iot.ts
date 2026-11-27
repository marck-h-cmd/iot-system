export type EscenarioSimulacion =
  | "normal"
  | "sobrecalentamiento"
  | "carga_extrema"
  | "demostracion"
  | "fallo_sensor";

export type ModoControl = "autonomo" | "manual";

export type ModoOperacionSistema = "simulacion" | "real" | "hibrido";

export interface TelemetriaNano {
  ventilador: boolean;
  angulo: number;
  direccion: 0 | 1 | 2;
  manual: boolean;
  proteccion: boolean;
  servo_activo: boolean;
}

export interface ConfirmacionNano {
  id: string;
  ventilador: boolean;
  angulo_objetivo: number;
  manual: boolean;
  proteccion: boolean;
  servo_activo: boolean;
}

export interface HardwareESP32Estado {
  control_usb?: { disponible: boolean; telemetria: TelemetriaNano | null };
  esp32_url: string;
  poll_interval_s: number;
  timeout_s: number;
  conectado: boolean;
  estado_enlace: "CONECTADO" | "DESCONECTADO" | "TELEMETRIA_ANTIGUA" | "ERROR_SENSOR";
  latencia_ms: number | null;
  edad_trama_s: number;
  total_intentos: number;
  total_exitosos: number;
  total_fallos: number;
  tasa_exito_pct: number;
  ultimo_exito_ts: number;
  ultimo_error: string | null;
  mapeo_sensores: {
    ds18b20: string;
    dht11: string;
  };
  datos_actuales: {
    temp: number | null;
    tdht: number | null;
    hum: number | null;
    ventilador: boolean;
    error: boolean;
    edad: number;
    angulo?: number;
    direccion?: "ds18b20" | "dht11" | "reposo" | null;
    modo_hardware?: string;
  };
}

export interface ZonaEstado {
  temperatura: number | null;
  humedad: number | null;
  prediccion_10m: number | null;
  tendencia_por_minuto?: number;
  alerta_preventiva?: boolean;
  probabilidad_sobrecalentamiento?: number;
  angulo_servo: number;
  nombre: string;
  sensor: string;
  tipo_sensor?: string;
  origen_datos?: string;
  origen?: "real" | "virtual" | "sin_sensor";
  estado_telemetria?: string;
  edad_trama_s?: number;
  ultima_temperatura_valida?: number | null;
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
  hardware_esp32?: HardwareESP32Estado;
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
  prediccion_10m?: number | null;
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
  precision_modelo_r2: number | null;
  error_absoluto_medio_mae: number | null;
  rmse_modelo: number | null;
  muestras_ml: number;
}

export interface EvaluacionModelo {
  origen: "real" | "virtual";
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  muestras_evaluadas: number;
}

export interface EvidenciaHistorica {
  hardware: {
    lecturas: number;
    zonas: { zona: string; sensor: string; lecturas: number; minima: number; maxima: number }[];
    transiciones: { zona: string; antes: number; inicio: number; posterior: number | null; minutos_hasta_posterior: number | null }[];
  };
  simulacion: { eventos: number; por_modo: Record<string, number>; latencia_mediana_ms: number | null };
  pares: { total: number; inicios_coincidentes: number; caida_declarada_media_c: number | null };
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
  desviacion_std_ms?: number | null;
  d_cohen?: number | null;
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
