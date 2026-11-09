import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  CheckCircle2,
  Compass,
  Fan,
  Power,
  RotateCcw,
  Send,
  Sliders,
  Sparkles,
} from "lucide-react-native";
import {
  EscenarioSimulacion,
  EstadoActualResponse,
  EventoControl,
  ModoControl,
} from "../types/iot";
import { ThemePalette, ZONAS_CONFIG } from "../styles/theme";
import { RadarServoNative } from "../components/RadarServoNative";

interface ControlScreenProps {
  estadoActual: EstadoActualResponse | null;
  eventos: EventoControl[];
  theme: ThemePalette;
  onCambiarModo: (modo: ModoControl) => Promise<void>;
  onEnviarComandoManual: (
    zona: string,
    angulo: number,
    fanOn: boolean
  ) => Promise<void>;
  onCambiarEscenario: (escenario: EscenarioSimulacion) => Promise<void>;
  onReiniciarSimulacion: () => Promise<void>;
  onOpenFullHistory: () => void;
}

const ESCENARIOS_LIST: {
  id: EscenarioSimulacion;
  label: string;
  desc: string;
}[] = [
  { id: "normal", label: "Normal", desc: "23 °C – 28 °C" },
  {
    id: "sobrecalentamiento",
    label: "Sobrecalentamiento",
    desc: "PC 2 y PC 4 > 35 °C",
  },
  {
    id: "carga_extrema",
    label: "Carga extrema",
    desc: "Estrés en 5 PCs",
  },
  {
    id: "demostracion",
    label: "Demostración",
    desc: "Barrido rotativo",
  },
  {
    id: "fallo_sensor",
    label: "Fallo sonda",
    desc: "Timeout en PC 3",
  },
];

export const ControlScreen: React.FC<ControlScreenProps> = ({
  estadoActual,
  eventos,
  theme,
  onCambiarModo,
  onEnviarComandoManual,
  onCambiarEscenario,
  onReiniciarSimulacion,
  onOpenFullHistory,
}) => {
  const [zonaTarget, setZonaTarget] = useState<string>(
    estadoActual?.zona_objetivo_actual || "zona1"
  );
  const [anguloTarget, setAnguloTarget] = useState<number>(
    estadoActual?.ultimo_angulo_servo ?? 0
  );
  const [fanTarget, setFanTarget] = useState<boolean>(
    estadoActual?.ventilador_activo ?? true
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const modoActual: ModoControl = estadoActual?.modo_control || "autonomo";
  const escenarioActual: EscenarioSimulacion =
    estadoActual?.escenario_simulacion || "normal";

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <View style={styles.container}>
      {/* 1. Estado del sistema y Selector de modo */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.statusHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Modo de operación
            </Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Estado confirmado:{" "}
              {estadoActual?.ventilador_activo
                ? "Ventilador encendido"
                : "Ventilador en reposo"}{" "}
              • {estadoActual?.ultimo_angulo_servo ?? 90}°
            </Text>
          </View>
          <View
            style={[
              styles.simTag,
              {
                backgroundColor: theme.amberSoft,
              },
            ]}
          >
            <Text style={[styles.simTagText, { color: theme.amber }]}>
              Simulación
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.segmentedContainer,
            { backgroundColor: theme.bgSubCard, borderColor: theme.borderCard },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              modoActual === "autonomo" && {
                backgroundColor: theme.accentPrimary,
              },
            ]}
            onPress={async () => {
              await onCambiarModo("autonomo");
              showFeedback("Modo automático IA confirmado por el backend.");
            }}
          >
            <Sparkles
              size={14}
              color={
                modoActual === "autonomo" ? "#FFFFFF" : theme.textSecondary
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    modoActual === "autonomo" ? "#FFFFFF" : theme.textSecondary,
                },
              ]}
            >
              Automático IA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              modoActual === "manual" && {
                backgroundColor: theme.accentPrimary,
              },
            ]}
            onPress={async () => {
              await onCambiarModo("manual");
              showFeedback("Modo manual activo.");
            }}
          >
            <Sliders
              size={14}
              color={modoActual === "manual" ? "#FFFFFF" : theme.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    modoActual === "manual" ? "#FFFFFF" : theme.textSecondary,
                },
              ]}
            >
              Manual
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Control de ventilador y Selector de computadora (PC 1-5) */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Control de ventilador y estación
        </Text>

        {/* Botón grande para ventilador */}
        <View style={styles.fanRow}>
          <TouchableOpacity
            style={[
              styles.fanLargeBtn,
              {
                backgroundColor: fanTarget
                  ? theme.emeraldSoft
                  : theme.bgSubCard,
                borderColor: fanTarget ? theme.emerald : theme.borderCard,
              },
            ]}
            onPress={() => setFanTarget(true)}
          >
            <Fan
              size={16}
              color={fanTarget ? theme.emerald : theme.textSecondary}
            />
            <Text
              style={[
                styles.fanLargeText,
                { color: fanTarget ? theme.emerald : theme.textSecondary },
              ]}
            >
              Encender ventilador
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fanLargeBtn,
              {
                backgroundColor: !fanTarget ? theme.roseSoft : theme.bgSubCard,
                borderColor: !fanTarget ? theme.rose : theme.borderCard,
              },
            ]}
            onPress={() => setFanTarget(false)}
          >
            <Power
              size={16}
              color={!fanTarget ? theme.rose : theme.textSecondary}
            />
            <Text
              style={[
                styles.fanLargeText,
                { color: !fanTarget ? theme.rose : theme.textSecondary },
              ]}
            >
              Apagar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Píldoras táctiles para elegir PC */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Seleccionar computadora objetivo (PC 1 – PC 5)
        </Text>
        <View style={styles.pcSelectRow}>
          {ZONAS_CONFIG.map((cfg) => {
            const active = zonaTarget === cfg.id;
            return (
              <TouchableOpacity
                key={cfg.id}
                style={[
                  styles.pcSelectBtn,
                  {
                    backgroundColor: active
                      ? theme.accentPrimary
                      : theme.bgSubCard,
                    borderColor: active
                      ? theme.accentPrimary
                      : theme.borderCard,
                  },
                ]}
                onPress={() => {
                  setZonaTarget(cfg.id);
                  setAnguloTarget(cfg.angulo);
                }}
              >
                <Text
                  style={[
                    styles.pcSelectTitle,
                    { color: active ? "#FFFFFF" : theme.textPrimary },
                  ]}
                >
                  {cfg.pc}
                </Text>
                <Text
                  style={[
                    styles.pcSelectSub,
                    {
                      color: active
                        ? "rgba(255,255,255,0.85)"
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {cfg.angulo}°
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ajuste fino de ángulo */}
        <View style={styles.angleControlRow}>
          <TouchableOpacity
            style={[
              styles.stepBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={() => setAnguloTarget(Math.max(0, anguloTarget - 15))}
          >
            <Text style={[styles.stepBtnText, { color: theme.textPrimary }]}>
              -15°
            </Text>
          </TouchableOpacity>
          <View style={styles.angleCenter}>
            <Compass size={15} color={theme.accentPrimary} />
            <Text style={[styles.angleValText, { color: theme.textPrimary }]}>
              Ángulo: {anguloTarget}°
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.stepBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={() => setAnguloTarget(Math.min(180, anguloTarget + 15))}
          >
            <Text style={[styles.stepBtnText, { color: theme.textPrimary }]}>
              +15°
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.execBtn, { backgroundColor: theme.accentPrimary }]}
          onPress={async () => {
            await onEnviarComandoManual(zonaTarget, anguloTarget, fanTarget);
            showFeedback(
              `Comando confirmado: ${zonaTarget.toUpperCase()} (${anguloTarget}°) • Ventilador ${
                fanTarget ? "ON" : "OFF"
              }`
            );
          }}
        >
          <Send size={15} color="#FFFFFF" />
          <Text style={styles.execBtnText}>Enviar comando al simulador</Text>
        </TouchableOpacity>

        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: theme.emeraldSoft, borderColor: theme.emerald },
            ]}
          >
            <CheckCircle2 size={14} color={theme.emerald} />
            <Text style={[styles.feedbackText, { color: theme.emerald }]}>
              {feedback}
            </Text>
          </View>
        )}
      </View>

      {/* 3. Radar de orientación compacto */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Radar de orientación (0° – 180°)
            </Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Toca un nodo para orientar directamente hacia esa PC
            </Text>
          </View>
        </View>

        <RadarServoNative
          estadoActual={estadoActual}
          theme={theme}
          onSelectZona={async (z, ang) => {
            setZonaTarget(z);
            setAnguloTarget(ang);
            await onEnviarComandoManual(z, ang, true);
            showFeedback(`Orientación confirmada hacia ${z.toUpperCase()} (${ang}°)`);
          }}
        />
      </View>

      {/* 4. Escenarios de simulación */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Escenarios de simulación
            </Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Régimen térmico sintético activo
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.resetBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={async () => {
              await onReiniciarSimulacion();
              showFeedback("Simulación reiniciada a estado base.");
            }}
          >
            <RotateCcw size={13} color={theme.accentPrimary} />
            <Text style={[styles.resetBtnText, { color: theme.textPrimary }]}>
              Reiniciar
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scenariosGrid}>
          {ESCENARIOS_LIST.map((esc) => {
            const active = escenarioActual === esc.id;
            return (
              <TouchableOpacity
                key={esc.id}
                style={[
                  styles.scenarioCard,
                  {
                    backgroundColor: active
                      ? theme.accentSoft
                      : theme.bgSubCard,
                    borderColor: active
                      ? theme.accentPrimary
                      : theme.borderCard,
                  },
                ]}
                onPress={async () => {
                  await onCambiarEscenario(esc.id);
                  showFeedback(`Escenario activo: ${esc.label}`);
                }}
              >
                <Text
                  style={[
                    styles.scenarioTitle,
                    { color: active ? theme.accentPrimary : theme.textPrimary },
                  ]}
                >
                  {esc.label}
                </Text>
                <Text
                  style={[styles.scenarioDesc, { color: theme.textSecondary }]}
                >
                  {esc.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. Historial de comandos recientes */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Historial de comandos
          </Text>
          <TouchableOpacity onPress={onOpenFullHistory}>
            <Text
              style={{
                color: theme.accentPrimary,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Ver todo →
            </Text>
          </TouchableOpacity>
        </View>

        {eventos.slice(0, 5).map((ev) => {
          const confirmado =
            Boolean(ev.confirmado_ack) ||
            ev.estado_comando === "EJECUTADO_SIMULACION";
          return (
            <View
              key={ev.id}
              style={[
                styles.eventRow,
                { borderBottomColor: theme.borderCard },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>
                  {ev.zona_objetivo.toUpperCase()} ({ev.angulo_servo}°) •{" "}
                  {ev.estado_ventilador ? "Ventilador ON" : "Ventilador OFF"}
                </Text>
                <Text
                  style={[styles.eventSub, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {ev.motivo}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: confirmado ? theme.emerald : theme.amber,
                    fontSize: 10.5,
                    fontWeight: "700",
                  }}
                >
                  {confirmado ? "Ejecutado (Sim)" : "Pendiente"}
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 10.5,
                    fontWeight: "600",
                  }}
                >
                  {ev.latencia_ms != null
                    ? `${Number(ev.latencia_ms).toFixed(0)} ms`
                    : "—"}
                </Text>
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
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  statusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  simTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fanRow: {
    flexDirection: "row",
    gap: 8,
  },
  fanLargeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  fanLargeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  pcSelectRow: {
    flexDirection: "row",
    gap: 6,
  },
  pcSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
  },
  pcSelectTitle: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  pcSelectSub: {
    fontSize: 10,
    fontWeight: "600",
  },
  angleControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  stepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  angleCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  angleValText: {
    fontSize: 13,
    fontWeight: "700",
  },
  execBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 2,
  },
  execBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  scenariosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scenarioCard: {
    width: "48%",
    flexGrow: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  scenarioTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  scenarioDesc: {
    fontSize: 10.5,
    marginTop: 2,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
});
