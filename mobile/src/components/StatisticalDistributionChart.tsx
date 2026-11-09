import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  Text as SvgText,
  Rect,
} from "react-native-svg";
import { ThemePalette } from "../styles/theme";

interface StatisticalDistributionChartProps {
  theme: ThemePalette;
}

export const StatisticalDistributionChart: React.FC<StatisticalDistributionChartProps> = ({
  theme,
}) => {
  const width = 340;
  const height = 150;
  const padLeft = 28;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Generate Gaussian normal curve points for Residuals (Error e = T - T_pred)
  // Centered at 0, sigma = 2.5
  const pointsCount = 40;
  const xMin = -6;
  const xMax = 6;
  const sigma = 2.4;

  const normalCurvePoints = [];
  for (let i = 0; i <= pointsCount; i++) {
    const xVal = xMin + (i / pointsCount) * (xMax - xMin);
    const yVal =
      (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow(xVal / sigma, 2));
    const px = padLeft + ((xVal - xMin) / (xMax - xMin)) * plotW;
    const py = padTop + plotH - (yVal / 0.18) * plotH;
    normalCurvePoints.push({ x: px, y: py });
  }

  const pathD = normalCurvePoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${(padLeft + plotW).toFixed(1)} ${(
    padTop + plotH
  ).toFixed(1)} L ${padLeft} ${(padTop + plotH).toFixed(1)} Z`;

  // MAE marker (+2.25) and target marker (+0.80)
  const xTarget = padLeft + ((0.8 - xMin) / (xMax - xMin)) * plotW;
  const xActual = padLeft + ((2.25 - xMin) / (xMax - xMin)) * plotW;
  const xZero = padLeft + ((0 - xMin) / (xMax - xMin)) * plotW;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Distribución de Residuos (Curva Gaussiana del Error)
        </Text>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Eje base X */}
        <Line
          x1={padLeft}
          y1={padTop + plotH}
          x2={padLeft + plotW}
          y2={padTop + plotH}
          stroke={theme.borderCard}
          strokeWidth={1}
        />

        {/* Eje central 0 error */}
        <Line
          x1={xZero}
          y1={padTop}
          x2={xZero}
          y2={padTop + plotH}
          stroke={theme.textSecondary}
          strokeDasharray="2 2"
          strokeWidth={1}
          opacity={0.4}
        />
        <SvgText
          x={xZero}
          y={padTop + plotH + 14}
          fontSize={8.5}
          fill={theme.textSecondary}
          textAnchor="middle"
        >
          0°C (μ)
        </SvgText>

        {/* Área y Curva de densidad */}
        <Path d={areaD} fill="url(#bellGrad)" />
        <Path
          d={pathD}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Meta Objetivo MAE < 0.80 °C */}
        <Line
          x1={xTarget}
          y1={padTop + 4}
          x2={xTarget}
          y2={padTop + plotH}
          stroke={theme.emerald}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <Circle cx={xTarget} cy={padTop + 4} r={3} fill={theme.emerald} />
        <SvgText
          x={xTarget}
          y={padTop - 2}
          fontSize={8}
          fill={theme.emerald}
          fontWeight="700"
          textAnchor="middle"
        >
          Meta 0.8°
        </SvgText>

        {/* MAE Actual 2.25 °C */}
        <Line
          x1={xActual}
          y1={padTop + 18}
          x2={xActual}
          y2={padTop + plotH}
          stroke={theme.amber}
          strokeWidth={1.5}
        />
        <Circle cx={xActual} cy={padTop + 18} r={3} fill={theme.amber} />
        <SvgText
          x={xActual + 2}
          y={padTop + 14}
          fontSize={8}
          fill={theme.amber}
          fontWeight="700"
          textAnchor="start"
        >
          MAE: 2.25°
        </SvgText>

        {/* Ticks X */}
        {[-4, -2, 2, 4].map((v) => {
          const xv = padLeft + ((v - xMin) / (xMax - xMin)) * plotW;
          return (
            <SvgText
              key={v}
              x={xv}
              y={padTop + plotH + 14}
              fontSize={8}
              fill={theme.textSecondary}
              textAnchor="middle"
            >
              {v > 0 ? `+${v}` : v}°
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.emerald }]} />
          <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
            Meta Teórica (&lt; 0.80 °C)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.amber }]} />
          <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
            Observado (2.25 °C)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  titleRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});

