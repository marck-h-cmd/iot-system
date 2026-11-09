import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Text as SvgText,
} from "react-native-svg";
import { ThemePalette } from "../styles/theme";

interface CoolingEfficiencyGaugeProps {
  dutyCyclePercent: number; // 0 to 100
  ahorroEstimadoPercent?: number; // e.g. 70.0
  ventiladorActivo: boolean;
  theme: ThemePalette;
  size?: number;
}

export const CoolingEfficiencyGauge: React.FC<CoolingEfficiencyGaugeProps> = ({
  dutyCyclePercent,
  ahorroEstimadoPercent = 70.0,
  ventiladorActivo,
  theme,
  size = 150,
}) => {
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc calculations: 270 degree gauge (from 135 deg to 405 deg)
  const angleRange = 260; // degrees
  const startAngle = 140; // degrees
  const totalLength = (circumference * angleRange) / 360;

  const dutyClamped = Math.max(0, Math.min(100, dutyCyclePercent));
  const progressLength = (dutyClamped / 100) * totalLength;

  // Helper polar to cartesian
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    r: number,
    startAng: number,
    endAng: number
  ) => {
    const start = polarToCartesian(x, y, r, endAng);
    const end = polarToCartesian(x, y, r, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const bgArc = describeArc(
    center,
    center,
    radius,
    startAngle,
    startAngle + angleRange
  );

  const currentEndAngle = startAngle + (dutyClamped / 100) * angleRange;
  const activeArc =
    dutyClamped > 0
      ? describeArc(center, center, radius, startAngle, currentEndAngle)
      : "";

  return (
    <View style={styles.card}>
      <View style={styles.gaugeWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="gaugeGradient" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0%" stopColor="#38BDF8" />
              <Stop offset="50%" stopColor="#2563EB" />
              <Stop offset="100%" stopColor="#10B981" />
            </LinearGradient>
          </Defs>

          {/* Background track */}
          <Path
            d={bgArc}
            fill="none"
            stroke={theme.borderCard}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.35}
          />

          {/* Active progress arc */}
          {dutyClamped > 0 && (
            <Path
              d={activeArc}
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}

          {/* Center metric text */}
          <SvgText
            x={center}
            y={center - 4}
            fontSize={22}
            fontWeight="800"
            fill={theme.textPrimary}
            textAnchor="middle"
          >
            {dutyClamped.toFixed(0)}%
          </SvgText>
          <SvgText
            x={center}
            y={center + 14}
            fontSize={9}
            fontWeight="600"
            fill={theme.textSecondary}
            textAnchor="middle"
          >
            DUTY CYCLE
          </SvgText>
        </Svg>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Estado de enfriamiento:
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color: ventiladorActivo ? theme.emerald : theme.textSecondary,
              },
            ]}
          >
            {ventiladorActivo ? "Activo (Dinámico)" : "Reposo Térmico"}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Ahorro de energía est.:
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: theme.accentPrimary, fontWeight: "700" },
            ]}
          >
            {ahorroEstimadoPercent.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Eficiencia vs Continuo:
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: theme.emerald, fontWeight: "700" },
            ]}
          >
            +{(100 - dutyClamped).toFixed(0)}% menos desgaste
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  gaugeWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  statRow: {
    flexDirection: "column",
    gap: 1,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
  },
});

