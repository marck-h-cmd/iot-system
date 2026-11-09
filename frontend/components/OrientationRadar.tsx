import React from "react";
import { EstadoActualResponse } from "../types/iot";

export const RADAR_TARGETS = [
  { angulo: 0, label: "0°", zona: "zona1", pc: "PC 1", x: 35, y: 122 },
  { angulo: 45, label: "45°", zona: "zona2", pc: "PC 2", x: 58, y: 60 },
  { angulo: 90, label: "90°", zona: "zona3", pc: "PC 3", x: 120, y: 32 },
  { angulo: 135, label: "135°", zona: "zona4", pc: "PC 4", x: 182, y: 60 },
  { angulo: 180, label: "180°", zona: "zona5", pc: "PC 5", x: 205, y: 122 },
];

interface OrientationRadarProps {
  estadoActual: EstadoActualResponse | null;
  darkMode: boolean;
  interactive?: boolean;
  onSelectTarget?: (zona: string, angulo: number) => void;
}

export function OrientationRadar({
  estadoActual,
  darkMode,
  interactive = false,
  onSelectTarget,
}: OrientationRadarProps) {
  const anguloServo = estadoActual?.ultimo_angulo_servo ?? 90;
  const fanOn = estadoActual?.ventilador_activo ?? false;
  const targetPoint =
    RADAR_TARGETS.find((t) => Math.abs(t.angulo - anguloServo) <= 22) ||
    RADAR_TARGETS[2];

  const accentColor = darkMode ? "#38BDF8" : "#0891B2";
  const gridStroke = darkMode ? "#334155" : "#CBD5E1";
  const labelColor = darkMode ? "#F8FAFC" : "#0F172A";
  const subLabelColor = darkMode ? "#CBD5E1" : "#475569";
  const hotColor = darkMode ? "#F87171" : "#DC2626";

  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox="0 0 240 146" className="w-full max-w-[270px] overflow-visible">
        {/* Semicírculos de referencia */}
        <path
          d="M 25 122 A 95 95 0 0 1 215 122"
          fill="none"
          stroke={gridStroke}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 60 122 A 60 60 0 0 1 180 122"
          fill="none"
          stroke={gridStroke}
          strokeWidth="1"
        />
        <line
          x1="20"
          y1="122"
          x2="220"
          y2="122"
          stroke={gridStroke}
          strokeWidth="1.5"
        />

        {/* Rayos radiales */}
        {RADAR_TARGETS.map((pt) => (
          <line
            key={pt.zona}
            x1="120"
            y1="122"
            x2={pt.x}
            y2={pt.y}
            stroke={gridStroke}
            strokeWidth="1"
            strokeOpacity="0.65"
          />
        ))}

        {/* Haz de ventilación simulado */}
        <polygon
          points={`120,122 ${targetPoint.x - 12},${targetPoint.y - 5} ${targetPoint.x + 12},${targetPoint.y + 5}`}
          fill={
            fanOn
              ? darkMode
                ? "rgba(56, 189, 248, 0.2)"
                : "rgba(8, 145, 178, 0.16)"
              : "rgba(148, 163, 184, 0.08)"
          }
        />

        {/* Vector aguja del servomotor */}
        <line
          x1="120"
          y1="122"
          x2={targetPoint.x}
          y2={targetPoint.y}
          stroke={fanOn ? accentColor : darkMode ? "#94A3B8" : "#64748B"}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Nodos de estaciones PC 1 a PC 5 */}
        {RADAR_TARGETS.map((pt) => {
          const isTarget = Math.abs(anguloServo - pt.angulo) <= 15;
          const zInfo = estadoActual?.zonas?.[pt.zona];
          const temp = zInfo?.temperatura ?? 0;
          const isHot = temp >= 35.0;
          const sinSenal = zInfo?.disponible === false;

          return (
            <g
              key={pt.label}
              onClick={() =>
                interactive && onSelectTarget && onSelectTarget(pt.zona, pt.angulo)
              }
              className={interactive ? "cursor-pointer" : ""}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isTarget ? 9 : 6.5}
                fill={
                  sinSenal
                    ? "#64748B"
                    : isHot
                    ? hotColor
                    : isTarget
                    ? accentColor
                    : darkMode
                    ? "#19263B"
                    : "#FFFFFF"
                }
                stroke={
                  sinSenal
                    ? "#94A3B8"
                    : isHot
                    ? hotColor
                    : isTarget
                    ? accentColor
                    : gridStroke
                }
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 13}
                textAnchor="middle"
                fill={isTarget ? accentColor : labelColor}
                fontSize="9.5"
                fontWeight="600"
              >
                {pt.pc} ({pt.label})
              </text>
              {zInfo && (
                <text
                  x={pt.x}
                  y={pt.y + 19}
                  textAnchor="middle"
                  fill={sinSenal ? subLabelColor : isHot ? hotColor : subLabelColor}
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {sinSenal ? "Sin señal" : `${temp.toFixed(1)}°C`}
                </text>
              )}
            </g>
          );
        })}

        {/* Eje central */}
        <circle
          cx="120"
          cy="122"
          r="7"
          fill={darkMode ? "#0B1220" : "#FFFFFF"}
          stroke={accentColor}
          strokeWidth="2.5"
        />
      </svg>

      {interactive && (
        <p className={`text-xs mt-1 text-center ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
          Selecciona una estación en el radar para orientar el servomotor simulado.
        </p>
      )}
    </div>
  );
}
