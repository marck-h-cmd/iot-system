import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Line,
  Circle,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { EstadoActualResponse } from "../types/iot";
import { ThemePalette } from "../styles/theme";

export const RADAR_POINTS_MOBILE = [
  { angulo: 0, label: "0°", zona: "zona1", pc: "PC 1", x: 35, y: 120 },
  { angulo: 45, label: "45°", zona: "zona2", pc: "PC 2", x: 58, y: 60 },
  { angulo: 90, label: "90°", zona: "zona3", pc: "PC 3", x: 120, y: 32 },
  { angulo: 135, label: "135°", zona: "zona4", pc: "PC 4", x: 182, y: 60 },
  { angulo: 180, label: "180°", zona: "zona5", pc: "PC 5", x: 205, y: 120 },
];

interface RadarServoNativeProps {
  estadoActual: EstadoActualResponse | null;
  theme: ThemePalette;
  onSelectZona?: (zona: string, angulo: number) => void;
}

export const RadarServoNative: React.FC<RadarServoNativeProps> = ({
  estadoActual,
  theme,
  onSelectZona,
}) => {
  const anguloActual = estadoActual?.ultimo_angulo_servo ?? 90;
  const fanOn = estadoActual?.ventilador_activo ?? false;
  const targetPt =
    RADAR_POINTS_MOBILE.find((p) => Math.abs(p.angulo - anguloActual) <= 22) ||
    RADAR_POINTS_MOBILE[2];

  return (
    <View style={styles.container}>
      <Svg width="100%" height={150} viewBox="0 0 240 146">
        <Path
          d="M 25 120 A 95 95 0 0 1 215 120"
          fill="none"
          stroke={theme.borderCard}
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />
        <Path
          d="M 55 120 A 65 65 0 0 1 185 120"
          fill="none"
          stroke={theme.borderCard}
          strokeWidth="1.2"
        />
        <Line
          x1="15"
          y1="120"
          x2="225"
          y2="120"
          stroke={theme.borderCard}
          strokeWidth="1.4"
        />

        {RADAR_POINTS_MOBILE.map((pt) => (
          <Line
            key={pt.zona}
            x1="120"
            y1="120"
            x2={pt.x}
            y2={pt.y}
            stroke={theme.borderCard}
            strokeWidth="1"
          />
        ))}

        <Polygon
          points={`120,120 ${targetPt.x - 12},${targetPt.y - 5} ${targetPt.x + 12},${targetPt.y + 5}`}
          fill={fanOn ? theme.accentSoft : "rgba(148, 163, 184, 0.08)"}
        />

        <Line
          x1="120"
          y1="120"
          x2={targetPt.x}
          y2={targetPt.y}
          stroke={fanOn ? theme.accentPrimary : theme.textSecondary}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {RADAR_POINTS_MOBILE.map((pt) => {
          const isTarget = Math.abs(anguloActual - pt.angulo) <= 15;
          const zInfo = estadoActual?.zonas?.[pt.zona];
          const temp = zInfo?.temperatura ?? 0;
          const isHot = temp >= 35.0;
          const sinSenal = zInfo?.disponible === false;

          return (
            <React.Fragment key={pt.zona}>
              <Circle
                cx={pt.x}
                cy={pt.y}
                r={isTarget ? 9.5 : 7}
                fill={
                  sinSenal
                    ? theme.textMuted
                    : isHot
                    ? theme.rose
                    : isTarget
                    ? theme.accentPrimary
                    : theme.bgSubCard
                }
                stroke={isTarget ? theme.accentPrimary : theme.borderCard}
                strokeWidth="2"
                onPress={() => onSelectZona && onSelectZona(pt.zona, pt.angulo)}
              />
              <SvgText
                x={pt.x}
                y={pt.y - 13}
                textAnchor="middle"
                fill={isTarget ? theme.accentPrimary : theme.textPrimary}
                fontSize="8.5"
                fontWeight="700"
              >
                {pt.pc} ({pt.label})
              </SvgText>
              {zInfo && (
                <SvgText
                  x={pt.x}
                  y={pt.y + 19}
                  textAnchor="middle"
                  fill={
                    sinSenal
                      ? theme.textSecondary
                      : isHot
                      ? theme.rose
                      : theme.textSecondary
                  }
                  fontSize="8"
                  fontWeight="600"
                >
                  {sinSenal ? "Fallo" : `${temp.toFixed(1)} °C`}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        <Circle
          cx="120"
          cy="120"
          r="8.5"
          fill={theme.bgCard}
          stroke={theme.accentPrimary}
          strokeWidth="2.4"
        />
        <Circle
          cx="120"
          cy="120"
          r="3.2"
          fill={fanOn ? theme.accentPrimary : theme.textSecondary}
        />
      </Svg>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Representación simulada del servomotor SG90 (0°–180°)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 10.5,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "500",
  },
});
