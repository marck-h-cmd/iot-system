import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fan, Compass, Activity, ShieldCheck } from 'lucide-react-native';
import { colors } from '../styles/theme';

interface HeroMetricsProps {
  fanActive: boolean;
  currentAngle: number;
  targetZoneName: string;
  latencyMs: number;
  packetsCount: number;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({
  fanActive,
  currentAngle,
  targetZoneName,
  latencyMs,
  packetsCount,
}) => {
  return (
    <View style={styles.grid}>
      <View
        style={[
          styles.kpiCard,
          {
            borderColor: fanActive ? 'rgba(244, 63, 94, 0.5)' : colors.surfaceBorder,
            backgroundColor: fanActive ? 'rgba(244, 63, 94, 0.08)' : colors.surface,
          },
        ]}
      >
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiTitle}>VENTILACIÓN</Text>
          <Fan size={16} color={fanActive ? colors.rose : colors.textMuted} />
        </View>
        <Text
          style={[
            styles.kpiValue,
            { color: fanActive ? colors.rose : colors.textPrimary },
          ]}
        >
          {fanActive ? 'ACTIVO' : 'REPOSO'}
        </Text>
        <Text style={styles.kpiSubtext}>
          {fanActive ? 'Disipación forzada' : 'Modo económico'}
        </Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiTitle}>DIRECCIÓN</Text>
          <Compass size={16} color={colors.cyan} />
        </View>
        <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
          {currentAngle}°
        </Text>
        <Text style={[styles.kpiSubtext, { color: colors.cyan }]}>
          → {targetZoneName}
        </Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiTitle}>LATENCIA ACK</Text>
          <Activity size={16} color={colors.emerald} />
        </View>
        <View style={styles.latencyRow}>
          <Text style={[styles.kpiValue, { color: colors.emerald }]}>
            {latencyMs.toFixed(0)}
          </Text>
          <Text style={styles.latencyUnit}>ms</Text>
        </View>
        <Text style={styles.kpiSubtext}>Tiempo real estricto</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiTitle}>TELEMETRÍA</Text>
          <ShieldCheck size={16} color={colors.purple} />
        </View>
        <Text style={[styles.kpiValue, { color: colors.purple }]}>
          {packetsCount}
        </Text>
        <Text style={styles.kpiSubtext}>Paquetes MQTT</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 12,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  kpiSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  latencyUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 3,
  },
});

