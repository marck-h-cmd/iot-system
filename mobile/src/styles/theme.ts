export const colors = {
  background: '#090D16',
  surface: '#111827',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  surfaceHighlight: '#1F2937',

  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  purple: '#A855F7',
  indigo: '#6366F1',

  statusConnected: '#10B981',
  statusConnecting: '#F59E0B',
  statusDisconnected: '#EF4444',
  statusError: '#DC2626',
};

export const zoneConfigurations: Record<string, { nombre: string; tipo: 'real' | 'virtual'; sensorLabel: string; angulo: number }> = {
  zona1: { nombre: 'PC 1', tipo: 'real', sensorLabel: 'DHT11', angulo: 0 },
  zona2: { nombre: 'PC 2', tipo: 'real', sensorLabel: 'DS18B20', angulo: 45 },
  zona3: { nombre: 'PC 3', tipo: 'virtual', sensorLabel: 'Virtual', angulo: 90 },
  zona4: { nombre: 'PC 4', tipo: 'virtual', sensorLabel: 'Virtual', angulo: 135 },
  zona5: { nombre: 'PC 5', tipo: 'virtual', sensorLabel: 'Virtual', angulo: 180 },
};

