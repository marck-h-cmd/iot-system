import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Sliders, Wind, CheckCircle2 } from 'lucide-react-native';
import { colors, zoneConfigurations } from '../styles/theme';
import { mqttService } from '../services/mqttClient';

interface ControlPanelProps {
  currentFanState: number;
  currentAngle: number;
  currentZone: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentFanState,
  currentAngle,
  currentZone,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>(currentZone || 'zona1');
  const [lastDispatched, setLastDispatched] = useState<string | null>(null);

  const handleSendCommand = (zoneKey: string, fanState: 0 | 1, angle: number) => {
    try {
      mqttService.publishControlAction(zoneKey, fanState, angle);
      setSelectedZone(zoneKey);
      setLastDispatched(`${zoneConfigurations[zoneKey]?.nombre || zoneKey} -> ${fanState === 1 ? 'ON' : 'OFF'} (${angle}°)`);

      setTimeout(() => {
        setLastDispatched(null);
      }, 4000);
    } catch (err: any) {
      Alert.alert('Error de Envío', err.message || 'No se pudo publicar la orden al broker.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sliders size={18} color={colors.cyan} />
          <Text style={styles.title}>Control Manual de Actuadores</Text>
        </View>
        <Text style={styles.subtitle}>Tópico MQTT: lab/piloto/accion</Text>
      </View>

      {lastDispatched && (
        <View style={styles.feedbackBanner}>
          <CheckCircle2 size={14} color={colors.emerald} />
          <Text style={styles.feedbackText}>Orden transmitida: {lastDispatched}</Text>
        </View>
      )}

      <View style={styles.zonesList}>
        {Object.entries(zoneConfigurations).map(([key, info]) => {
          const isSelected = selectedZone === key;

          return (
            <View
              key={key}
              style={[
                styles.zoneRow,
                isSelected && { borderColor: 'rgba(6, 182, 212, 0.4)', backgroundColor: 'rgba(6, 182, 212, 0.05)' },
              ]}
            >
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneNameText}>{info.nombre}</Text>
                <Text style={styles.zoneAngleText}>{info.angulo}° ({info.tipo === 'real' ? 'Físico' : 'Virtual'})</Text>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.fanOnButton]}
                  onPress={() => handleSendCommand(key, 1, info.angulo)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonTextOn}>FAN ON</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.fanOffButton]}
                  onPress={() => handleSendCommand(key, 0, info.angulo)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonTextOff}>OFF</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 14,
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: '600',
  },
  zonesList: {
    gap: 8,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1322',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoneAngleText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fanOnButton: {
    backgroundColor: colors.rose,
  },
  fanOffButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonTextOn: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonTextOff: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
});
