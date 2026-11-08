import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Cpu } from 'lucide-react-native';
import { colors } from '../styles/theme';

interface ZoneCardProps {
  zoneId: string;
  nombre: string;
  tipo: 'real' | 'virtual';
  sensorLabel: string;
  angulo: number;
  temperatura: number | null;
  temperaturaPredicha?: number | null;
  isActiveTarget: boolean;
}

export const ZoneCard: React.FC<ZoneCardProps> = ({
  nombre,
  tipo,
  sensorLabel,
  angulo,
  temperatura,
  temperaturaPredicha,
  isActiveTarget,
}) => {
  const currentTemp = temperatura ?? 0;
  const isCritical = currentTemp >= 35.0;
  const isWarning = currentTemp >= 33.0 && currentTemp < 35.0;

  const tempColor = isCritical
    ? colors.rose
    : isWarning
    ? colors.amber
    : colors.cyan;

  const cardBorderColor = isActiveTarget
    ? colors.rose
    : isCritical
    ? 'rgba(244, 63, 94, 0.6)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.5)'
    : colors.surfaceBorder;

  const cardBackground = isActiveTarget
    ? 'rgba(244, 63, 94, 0.12)'
    : isCritical
    ? 'rgba(244, 63, 94, 0.06)'
    : colors.surface;

  return (
    <View style={[styles.card, { borderColor: cardBorderColor, backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.zoneName}>{nombre}</Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  tipo === 'real' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                borderColor:
                  tipo === 'real' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(168, 85, 247, 0.4)',
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: tipo === 'real' ? colors.cyan : colors.purple },
              ]}
            >
              {tipo === 'real' ? 'FÍSICO' : 'VIRTUAL'}
            </Text>
          </View>
        </View>

        <Text style={styles.sensorText}>{sensorLabel}</Text>
      </View>

      <View style={styles.tempRow}>
        <View style={styles.tempValueContainer}>
          <Text style={[styles.tempValue, { color: tempColor }]}>
            {temperatura !== null ? currentTemp.toFixed(1) : '--.-'}
          </Text>
          <Text style={styles.tempUnit}>°C</Text>
        </View>

        {isCritical && <Flame size={20} color={colors.rose} />}
      </View>

      <View style={styles.footer}>
        <Text style={styles.predictionText}>
          {temperaturaPredicha ? `↗ ${temperaturaPredicha.toFixed(1)}°C (+10m)` : 'Estable'}
        </Text>
        <Text style={styles.angleText}>{angulo}°</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sensorText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  tempRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  tempValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tempValue: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  tempUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  predictionText: {
    fontSize: 11,
    color: colors.purple,
    fontWeight: '500',
  },
  angleText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
