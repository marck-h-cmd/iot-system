import Paho from 'paho-mqtt';
import { BrokerConfig, ConnectionStatus, TelemetryPayload, ControlActionPayload, AckPayload } from '../types/iot';

if (typeof window !== 'undefined' && !window.localStorage) {
  (window as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export const DEFAULT_BROKER_CONFIG: BrokerConfig = {
  host: '192.168.1.5',
  port: 8083,
  path: '/mqtt',
  username: 'sensor_iot',
  password: 'marck124M',
  clientId: `Mobile_UNT_${Math.random().toString(16).substring(2, 8)}`,
  useSsl: false,
};

type TelemetryCallback = (telemetry: TelemetryPayload) => void;
type ActionCallback = (action: ControlActionPayload) => void;
type AckCallback = (ack: AckPayload) => void;
type StatusCallback = (status: ConnectionStatus, error?: string) => void;

class MqttService {
  private client: Paho.Client | null = null;
  private config: BrokerConfig = { ...DEFAULT_BROKER_CONFIG };
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimeout: any = null;

  private onTelemetryListeners: Set<TelemetryCallback> = new Set();
  private onActionListeners: Set<ActionCallback> = new Set();
  private onAckListeners: Set<AckCallback> = new Set();
  private onStatusListeners: Set<StatusCallback> = new Set();

  public getConfig(): BrokerConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<BrokerConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public connect(customConfig?: Partial<BrokerConfig>) {
    if (customConfig) {
      this.setConfig(customConfig);
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client && this.client.isConnected()) {
      try {
        this.client.disconnect();
      } catch (err) {
        // Disconnect previous session before reconnecting
      }
    }

    this.updateStatus('connecting');

    try {
      this.client = new Paho.Client(
        this.config.host,
        Number(this.config.port),
        this.config.path,
        this.config.clientId
      );

      this.client.onConnectionLost = (responseObject) => {
        const errorMsg = responseObject.errorMessage || 'Connection lost';
        this.updateStatus('disconnected', errorMsg);
        this.scheduleReconnect();
      };

      this.client.onMessageArrived = (message) => {
        this.handleIncomingMessage(message.destinationName, message.payloadString);
      };

      this.client.connect({
        userName: this.config.username,
        password: this.config.password,
        useSSL: this.config.useSsl,
        timeout: 6,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          this.updateStatus('connected');
          this.subscribeTopics();
        },
        onFailure: (err) => {
          this.updateStatus('error', err.errorMessage || 'Authentication or network failure');
          this.scheduleReconnect();
        },
      });
    } catch (e: any) {
      this.updateStatus('error', e.message || 'Initialization error');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client && this.client.isConnected()) {
      try {
        this.client.disconnect();
      } catch (err) {
        // Safe disconnect
      }
    }
    this.updateStatus('disconnected');
  }

  private subscribeTopics() {
    if (!this.client || !this.client.isConnected()) return;

    this.client.subscribe('lab/piloto/+/temp', { qos: 0 });
    this.client.subscribe('lab/piloto/accion', { qos: 0 });
    this.client.subscribe('lab/piloto/ack', { qos: 0 });
  }

  private handleIncomingMessage(topic: string, payload: string) {
    try {
      const data = JSON.parse(payload);

      if (topic.startsWith('lab/piloto/') && topic.endsWith('/temp')) {
        this.onTelemetryListeners.forEach((listener) => listener(data));
      } else if (topic === 'lab/piloto/accion') {
        this.onActionListeners.forEach((listener) => listener(data));
      } else if (topic === 'lab/piloto/ack') {
        this.onAckListeners.forEach((listener) => listener(data));
      }
    } catch (err) {
      // Ignore malformed payloads
    }
  }

  public publishControlAction(zone: string, fanState: 0 | 1, servoAngle: number) {
    if (!this.client || !this.client.isConnected()) {
      throw new Error('MQTT client is not connected to broker');
    }

    const payload: ControlActionPayload = {
      zona_objetivo: zone,
      fan_state: fanState,
      servo_angle: servoAngle,
      timestamp_decision: Date.now() / 1000,
    };

    const message = new Paho.Message(JSON.stringify(payload));
    message.destinationName = 'lab/piloto/accion';
    message.qos = 0;
    this.client.send(message);
  }

  private scheduleReconnect() {
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        if (this.status !== 'connected') {
          this.connect();
        }
      }, 5000);
    }
  }

  private updateStatus(newStatus: ConnectionStatus, error?: string) {
    this.status = newStatus;
    this.onStatusListeners.forEach((listener) => listener(newStatus, error));
  }

  public onTelemetry(callback: TelemetryCallback): () => void {
    this.onTelemetryListeners.add(callback);
    return () => this.onTelemetryListeners.delete(callback);
  }

  public onAction(callback: ActionCallback): () => void {
    this.onActionListeners.add(callback);
    return () => this.onActionListeners.delete(callback);
  }

  public onAck(callback: AckCallback): () => void {
    this.onAckListeners.add(callback);
    return () => this.onAckListeners.delete(callback);
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.onStatusListeners.add(callback);
    return () => this.onStatusListeners.delete(callback);
  }
}

export const mqttService = new MqttService();
