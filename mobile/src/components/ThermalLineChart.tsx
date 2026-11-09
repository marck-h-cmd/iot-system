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
} from "react-native-svg";
import { ThemePalette } from "../styles/theme";

interface DataPoint {
  hora: string;
  temperatura: number;
  prediccion: number;
}

interface ThermalLineChartProps {
  data: DataPoint[];
  theme: ThemePalette;
  height?: number;
}

export const ThermalLineChart: React.FC<ThermalLineChartProps> = ({
  data,
  theme,
  height = 175,
}) => {
  const width = 340;
  const padLeft = 32;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minTemp = 18;
  const maxTemp = 45;

  const getY = (val: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, val));
    return padTop + plotH - ((clamped - minTemp) / (maxTemp - minTemp)) * plotH;
  };

  const getX = (idx: number, total: number) => {
    if (total <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (total - 1)) * plotW;
  };

  const points =
    data.length > 0
      ? data
      : [{ hora: "--:--", temperatura: 25, prediccion: 25.5 }];

  const lineReal = points
    .map(
      (pt, i) =>
        `${i === 0 ? "M" : "L"} ${getX(i, points.length).toFixed(1)} ${getY(
          pt.temperatura
        ).toFixed(1)}`
    )
    .join(" ");

  const areaReal = `${lineReal} L ${getX(
    points.length - 1,
    points.length
  ).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${padLeft} ${(
    padTop + plotH
  ).toFixed(1)} Z`;

  const linePred = points
    .map(
      (pt, i) =>
        `${i === 0 ? "M" : "L"} ${getX(i, points.length).toFixed(1)} ${getY(
          pt.prediccion
        ).toFixed(1)}`
    )
    .join(" ");

  const yThreshold = getY(35.0);

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaPrimary" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={theme.accentPrimary}
              stopOpacity="0.22"
            />
            <Stop
              offset="100%"
              stopColor={theme.accentPrimary}
              stopOpacity="0.0"
            />
          </LinearGradient>
        </Defs>

        {[20, 27, 35, 42].map((tVal) => {
          const y = getY(tVal);
          return (
            <React.Fragment key={tVal}>
              <Line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={tVal === 35 ? theme.rose : theme.borderCard}
                strokeWidth={tVal === 35 ? "1.2" : "1"}
                strokeDasharray={tVal === 35 ? "4 3" : "2 3"}
              />
              <SvgText
                x={padLeft - 6}
                y={y + 3}
                fontSize="9"
                fill={tVal === 35 ? theme.rose : theme.textSecondary}
                textAnchor="end"
                fontWeight="600"
              >
                {tVal}°
              </SvgText>
            </React.Fragment>
          );
        })}

        <SvgText
          x={width - padRight - 2}
          y={yThreshold - 4}
          fontSize="8.5"
          fill={theme.rose}
          textAnchor="end"
          fontWeight="600"
        >
          Umbral 35 °C
        </SvgText>

        <Path d={areaReal} fill="url(#areaPrimary)" />
        <Path
          d={lineReal}
          fill="none"
          stroke={theme.accentPrimary}
          strokeWidth="2.2"
        />

        <Path
          d={linePred}
          fill="none"
          stroke={theme.cyan}
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />

        {points.length > 0 && (
          <Circle
            cx={getX(points.length - 1, points.length)}
            cy={getY(points[points.length - 1].temperatura)}
            r="3.5"
            fill={theme.accentPrimary}
          />
        )}

        {points.length > 1 && (
          <>
            <SvgText
              x={padLeft}
              y={height - 5}
              fontSize="8.5"
              fill={theme.textSecondary}
              textAnchor="start"
            >
              {points[0].hora}
            </SvgText>
            <SvgText
              x={width / 2}
              y={height - 5}
              fontSize="8.5"
              fill={theme.textSecondary}
              textAnchor="middle"
            >
              {points[Math.floor(points.length / 2)].hora}
            </SvgText>
            <SvgText
              x={width - padRight}
              y={height - 5}
              fontSize="8.5"
              fill={theme.textSecondary}
              textAnchor="end"
            >
              {points[points.length - 1].hora}
            </SvgText>
          </>
        )}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.dot, { backgroundColor: theme.accentPrimary }]}
          />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Observada
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.cyan }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Predicción (+10m)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.rose }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Umbral (35 °C)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
});
