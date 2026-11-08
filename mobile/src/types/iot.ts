export interface TelemetryPayload {
  zona: string;
  temperatura: number;
  temperatura_predicha?: number;
  sensor?: string;
  origen?: 'real' | 'virtual';
  timestamp_origen?: number;
  estado_ventilador?: number;
  angulo_servo?: number;
}

export interface ControlActionPayload {
  zona_objetivo: string;
  fan_state: number;
  servo_angle: number;
  timestamp_decision?: number;
}

export interface AckPayload {
  tipo: string;
  zona: string;
  latencia_ejecucion_ms: number;
  timestamp_ack?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BrokerConfig {
  host: string;
  port: number;
  path: string;
  username: string;
  password: string;
  clientId: string;
  useSsl: boolean;
}

export interface ZoneMetadata {
  id: string;
  nombre: string;
  tipo: 'real' | 'virtual';
  sensorLabel: string;
  anguloBase: number;
}

