import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Line,
  Text as SvgText,
  Circle,
} from "react-native-svg";
import { ThemePalette, ZONAS_CONFIG } from "../styles/theme";
import { EstadoActualResponse } from "../types/iot";

export interface ZoneBarItem {
  id: string;
  pc: string;
  nombre: string;
  angulo: number;
  sensor: string;
}

interface MultiZoneThermalBarChartProps {
  zonasConfig?: readonly ZoneBarItem[];
  estadoActual: EstadoActualResponse | null;
  selectedZone: string;
  onSelectZone: (zoneId: string) => void;
  theme: ThemePalette;
}

export const MultiZoneThermalBarChart: React.FC<MultiZoneThermalBarChartProps> = ({
  zonasConfig = ZONAS_CONFIG,
  estadoActual,
  selectedZone,
  onSelectZone,
  theme,
}) => {
  const width = 340;
  const height = 180;
  const padLeft = 46;
  const padRight = 54;
  const padTop = 20;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minTemp = 20;
  const maxTemp = 44;
  const threshold = 35.0;

  const getX = (val: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, val));
    return padLeft + ((clamped - minTemp) / (maxTemp - minTemp)) * plotW;
  };

  const xThreshold = getX(threshold);
  const rowHeight = plotH / zonasConfig.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Comparativa Térmica por Estación (5 PCs)
        </Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.emerald }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Real
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                { backgroundColor: theme.amber, opacity: 0.8 },
              ]}
            />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              +10m
            </Text>
          </View>
        </View>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="barGradEmerald" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.95" />
          </LinearGradient>
          <LinearGradient id="barGradAmber" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0.95" />
          </LinearGradient>
          <LinearGradient id="barGradRose" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Ejes y marcas de temperatura */}
        {[20, 25, 30, 35, 40].map((t) => {
          const x = getX(t);
          return (
            <React.Fragment key={`grid-${t}`}>
              <Line
                x1={x}
                y1={padTop}
                x2={x}
                y2={padTop + plotH}
                stroke={t === 35 ? theme.rose : theme.borderCard}
                strokeDasharray={t === 35 ? "4 3" : "2 2"}
                strokeWidth={t === 35 ? 1.5 : 1}
                opacity={t === 35 ? 0.75 : 0.35}
              />
              <SvgText
                x={x}
                y={padTop + plotH + 14}
                fontSize={9}
                fill={t === 35 ? theme.rose : theme.textSecondary}
                fontWeight={t === 35 ? "700" : "400"}
                textAnchor="middle"
              >
                {t}°
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Etiqueta Umbral 35°C */}
        <SvgText
          x={xThreshold}
          y={padTop - 6}
          fontSize={8.5}
          fill={theme.rose}
          fontWeight="700"
          textAnchor="middle"
        >
          Umbral 35.0°C
        </SvgText>

        {/* Barras de cada Zona */}
        {zonasConfig.map((cfg, idx) => {
          const y = padTop + idx * rowHeight;
          const barH = 14;
          const barY = y + (rowHeight - barH) / 2;

          const zState = estadoActual?.zonas?.[cfg.id];
          const temp = zState?.temperatura ?? 25.0;
          const pred = zState?.prediccion_10m ?? temp;
          const isTarget = estadoActual?.zona_objetivo_actual === cfg.id;
          const isSelected = selectedZone === cfg.id;

          const barW = Math.max(4, getX(temp) - padLeft);
          const predX = getX(pred);

          let fillId = "url(#barGradEmerald)";
          let accentCol = theme.emerald;
          if (temp >= 35.0) {
            fillId = "url(#barGradRose)";
            accentCol = theme.rose;
          } else if (temp >= 31.0) {
            fillId = "url(#barGradAmber)";
            accentCol = theme.amber;
          }

          return (
            <React.Fragment key={cfg.id}>
              {/* Resaltado de fondo de fila seleccionada */}
              {isSelected && (
                <Rect
                  x={2}
                  y={y + 1}
                  width={width - 4}
                  height={rowHeight - 2}
                  rx={4}
                  fill={theme.accentPrimary}
                  opacity={0.08}
                />
              )}

              {/* Etiqueta de la PC (izquierda) */}
              <SvgText
                x={padLeft - 6}
                y={barY + barH - 3}
                fontSize={10}
                fill={isSelected ? theme.accentPrimary : theme.textPrimary}
                fontWeight={isSelected || isTarget ? "700" : "500"}
                textAnchor="end"
              >
                {cfg.pc}
              </SvgText>

              {/* Fondo del canal de barra */}
              <Rect
                x={padLeft}
                y={barY}
                width={plotW}
                height={barH}
                rx={4}
                fill={theme.borderCard}
                opacity={0.25}
              />

              {/* Barra de temperatura Real */}
              <Rect
                x={padLeft}
                y={barY}
                width={barW}
                height={barH}
                rx={4}
                fill={fillId}
              />

              {/* Marcador de predicción a +10m (línea vertical con punto) */}
              <Line
                x1={predX}
                y1={barY - 2}
                x2={predX}
                y2={barY + barH + 2}
                stroke={pred >= 35 ? theme.rose : theme.amber}
                strokeWidth={2}
              />
              <Circle
                cx={predX}
                cy={barY - 2}
                r={2.5}
                fill={pred >= 35 ? theme.rose : theme.amber}
              />

              {/* Valor numérico a la derecha */}
              <SvgText
                x={padLeft + plotW + 8}
                y={barY + barH - 3}
                fontSize={9.5}
                fill={accentCol}
                fontWeight="700"
                textAnchor="start"
              >
                {temp.toFixed(1)}°
              </SvgText>

              {/* Indicador de ventilador activo en esta zona */}
              {isTarget && estadoActual?.ventilador_activo && (
                <Circle
                  cx={padLeft + plotW + 42}
                  cy={barY + barH / 2}
                  r={3.5}
                  fill={theme.accentPrimary}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.footerRow}>
        {zonasConfig.map((cfg) => {
          const isSelected = selectedZone === cfg.id;
          return (
            <TouchableOpacity
              key={cfg.id}
              style={[
                styles.pcFilterChip,
                {
                  backgroundColor: isSelected
                    ? theme.accentPrimary
                    : theme.bgSubCard,
                  borderColor: isSelected
                    ? theme.accentPrimary
                    : theme.borderCard,
                },
              ]}
              onPress={() => onSelectZone(cfg.id)}
            >
              <Text
                style={[
                  styles.pcFilterText,
                  {
                    color: isSelected ? "#FFFFFF" : theme.textSecondary,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {cfg.pc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  pcFilterChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  pcFilterText: {
    fontSize: 11,
  },
});
