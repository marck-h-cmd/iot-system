import React from "react";
import {
  CheckCircle2,
  Fan,
  Power,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  EscenarioSimulacion,
  EstadoActualResponse,
  EventoControl,
  ModoControl,
} from "../../types/iot";
import { OrientationRadar, RADAR_TARGETS } from "../OrientationRadar";

interface ControlDiagnosticsViewProps {
  estadoActual: EstadoActualResponse | null;
  eventos: EventoControl[];
  darkMode: boolean;
  cardClass: string;
  subCardClass: string;
  controlZona: string;
  setControlZona: (z: string) => void;
  controlAngulo: number;
  setControlAngulo: (a: number) => void;
  controlFan: boolean;
  setControlFan: (f: boolean) => void;
  enviandoControl: boolean;
  feedbackControl: string | null;
  onCambiarModoControl: (modo: ModoControl) => void;
  onEnviarControlManual: (zona?: string, angulo?: number, fan?: boolean) => void;
  onCambiarEscenario: (escenario: EscenarioSimulacion) => void;
  onReiniciarSimulacion: () => void;
}

const ESCENARIOS: {
  id: EscenarioSimulacion;
  titulo: string;
  desc: string;
}[] = [
  {
    id: "normal",
    titulo: "Normal",
    desc: "Temperaturas estables (28 °C – 33.5 °C)",
  },
  {
    id: "sobrecalentamiento",
    titulo: "Sobrecalentamiento",
    desc: "Incremento térmico en PC 2 y PC 4 (> 35 °C)",
  },
  {
    id: "carga_extrema",
    titulo: "Carga extrema",
    desc: "Estrés simultáneo en múltiples estaciones",
  },
  {
    id: "demostracion",
    titulo: "Demostración",
    desc: "Rotación automática entre las 5 zonas",
  },
  {
    id: "fallo_sensor",
    titulo: "Fallo de sensor",
    desc: "Simula pérdida de señal en PC 2",
  },
];

export function ControlDiagnosticsView({
  estadoActual,
  eventos,
  darkMode,
  cardClass,
  subCardClass,
  controlZona,
  setControlZona,
  controlAngulo,
  setControlAngulo,
  controlFan,
  setControlFan,
  enviandoControl,
  feedbackControl,
  onCambiarModoControl,
  onEnviarControlManual,
  onCambiarEscenario,
  onReiniciarSimulacion,
}: ControlDiagnosticsViewProps) {
  const modoControl: ModoControl = estadoActual?.modo_control || "autonomo";
  const escenarioActual: EscenarioSimulacion =
    estadoActual?.escenario_simulacion || "normal";

  const textPrimary = darkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = darkMode ? "text-slate-300" : "text-slate-600";
  const textMuted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
      {/* 1. Estado del sistema (barra operacional compacta) */}
      <div
        className={`${cardClass} rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4`}
      >
        <div>
          <span className={`text-xs block ${textSecondary}`}>
            Conexión MQTT
          </span>
          <span
            className={`text-sm font-semibold mt-0.5 block ${
              estadoActual?.mqtt_conectado
                ? darkMode
                  ? "text-emerald-400"
                  : "text-green-700"
                : darkMode
                ? "text-rose-400"
                : "text-red-700"
            }`}
          >
            {estadoActual?.mqtt_conectado ? "Conectado (EMQX)" : "Reconectando"}
          </span>
        </div>

        <div>
          <span className={`text-xs block ${textSecondary}`}>
            Modo de operación
          </span>
          <span className={`text-sm font-semibold mt-0.5 block ${textPrimary}`}>
            {modoControl === "manual" ? "Manual" : "Automático (IA)"}
          </span>
        </div>

        <div>
          <span className={`text-xs block ${textSecondary}`}>
            Actuadores (Simulados)
          </span>
          <span className={`text-sm font-semibold font-mono mt-0.5 block ${textPrimary}`}>
            Fan {estadoActual?.ventilador_activo ? "ON" : "OFF"} • Servo{" "}
            {estadoActual?.ultimo_angulo_servo ?? 90}°
          </span>
        </div>

        <div>
          <span className={`text-xs block ${textSecondary}`}>
            Confirmaciones ACK
          </span>
          <span className={`text-sm font-semibold font-mono mt-0.5 block ${textPrimary}`}>
            {estadoActual?.acks_recibidos ?? 0} recibidos (
            {estadoActual?.latencia_ultima_ms != null
              ? `${Number(estadoActual.latencia_ultima_ms).toFixed(0)} ms`
              : "—"}
            )
          </span>
        </div>
      </div>

      {/* Consola operacional principal: Controles (Izquierda) + Radar (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna izquierda: 2. Modo, 3. Ventilador, 4. Computadora */}
        <div className={`lg:col-span-7 ${cardClass} rounded-xl p-5 space-y-5`}>
          {/* 2. Selector Manual / Automático */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold ${textPrimary}`}>
                Modo de control
              </label>
              <span className={`text-xs ${textMuted}`}>
                {modoControl === "manual"
                  ? "El bucle autónomo está en pausa"
                  : "Gobernanza predictiva activa"}
              </span>
            </div>

            <div
              className={`grid grid-cols-2 p-1 rounded-lg border ${
                darkMode
                  ? "bg-[#0B1220] border-slate-700"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => onCambiarModoControl("autonomo")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                  modoControl === "autonomo"
                    ? darkMode
                      ? "bg-sky-500 text-slate-950"
                      : "bg-white text-slate-900 shadow-xs"
                    : textSecondary
                }`}
              >
                Automático
              </button>
              <button
                onClick={() => onCambiarModoControl("manual")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
                  modoControl === "manual"
                    ? darkMode
                      ? "bg-sky-500 text-slate-950"
                      : "bg-white text-slate-900 shadow-xs"
                    : textSecondary
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* 3. Control del ventilador */}
          <div>
            <label className={`text-xs font-semibold block mb-2 ${textPrimary}`}>
              Control del ventilador (Simulado)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setControlFan(true)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  controlFan
                    ? darkMode
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-green-50 border-green-600 text-green-800"
                    : `${subCardClass} ${textSecondary}`
                }`}
              >
                <Fan className={`w-4 h-4 ${controlFan ? "animate-spin" : ""}`} />
                Encender ventilador
              </button>

              <button
                onClick={() => setControlFan(false)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  !controlFan
                    ? darkMode
                      ? "bg-rose-500/20 border-rose-400 text-rose-300"
                      : "bg-red-50 border-red-600 text-red-800"
                    : `${subCardClass} ${textSecondary}`
                }`}
              >
                <Power className="w-4 h-4" />
                Apagar ventilador
              </button>
            </div>
          </div>

          {/* 4. Selector de computadora y ángulo simulado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold ${textPrimary}`}>
                Selección de computadora y ángulo (Servomotor simulado)
              </label>
              <span className={`text-xs font-mono font-semibold ${textPrimary}`}>
                {controlAngulo}°
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {RADAR_TARGETS.map((t) => {
                const selected = controlZona === t.zona;
                return (
                  <button
                    key={t.zona}
                    onClick={() => {
                      setControlZona(t.zona);
                      setControlAngulo(t.angulo);
                    }}
                    className={`py-2.5 px-2 rounded-lg border text-center transition-colors ${
                      selected
                        ? darkMode
                          ? "bg-sky-500/20 border-sky-400 text-sky-300"
                          : "bg-blue-50 border-blue-600 text-blue-800"
                        : `${subCardClass} ${textSecondary}`
                    }`}
                  >
                    <span className="text-xs font-semibold block">{t.pc}</span>
                    <span className="text-[11px] font-mono opacity-80">
                      {t.angulo}°
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={controlAngulo}
              onChange={(e) => setControlAngulo(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
              aria-label="Ángulo simulado del servomotor"
            />
          </div>

          {/* Botón de envío */}
          <button
            onClick={() => onEnviarControlManual()}
            disabled={enviandoControl}
            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              darkMode
                ? "bg-sky-500 hover:bg-sky-400 text-slate-950"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {enviandoControl
              ? "Enviando comando..."
              : `Aplicar en simulador (${controlZona.toUpperCase()} • ${controlAngulo}° • Fan ${
                  controlFan ? "ON" : "OFF"
                })`}
          </button>

          {feedbackControl && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                darkMode
                  ? "bg-sky-950/40 border-sky-500/40 text-sky-200"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackControl}</span>
            </div>
          )}
        </div>

        {/* 5. Radar de orientación (Derecha, 5 columnas) */}
        <div
          className={`lg:col-span-5 ${cardClass} rounded-xl p-5 flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                Radar de orientación
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Representación simulada del servomotor SG90
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                darkMode
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Simulación
            </span>
          </div>

          <OrientationRadar
            estadoActual={estadoActual}
            darkMode={darkMode}
            interactive
            onSelectTarget={(z, ang) => {
              setControlZona(z);
              setControlAngulo(ang);
              onEnviarControlManual(z, ang, true);
            }}
          />
        </div>
      </div>

      {/* 6. Escenarios de simulación */}
      <div className={`${cardClass} rounded-xl p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>
              Escenarios de simulación
            </h2>
            <p className={`text-xs ${textSecondary}`}>
              Selecciona el comportamiento térmico de las 5 computadoras virtuales
            </p>
          </div>

          <button
            onClick={onReiniciarSimulacion}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${subCardClass} ${textPrimary} ${
              darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar simulación
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {ESCENARIOS.map((esc) => {
            const active = escenarioActual === esc.id;
            return (
              <button
                key={esc.id}
                onClick={() => onCambiarEscenario(esc.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  active
                    ? darkMode
                      ? "bg-sky-500/15 border-sky-400 text-slate-100"
                      : "bg-blue-50 border-blue-600 text-slate-900"
                    : `${subCardClass} ${textSecondary}`
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${textPrimary}`}>
                    {esc.titulo}
                  </span>
                  {active && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        darkMode ? "text-sky-400" : "text-blue-600"
                      }`}
                    />
                  )}
                </div>
                <p className={`text-[11px] leading-snug ${textMuted}`}>
                  {esc.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Historial de comandos */}
      <div className={`${cardClass} rounded-xl p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${textPrimary}`}>
            Historial de comandos
          </h3>
          <span className={`text-xs ${textMuted}`}>
            Últimas {Math.min(eventos.length, 10)} órdenes registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className={`border-b ${
                  darkMode ? "border-slate-700" : "border-slate-200"
                } ${textSecondary}`}
              >
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 px-3 font-medium">Estación</th>
                <th className="py-2 px-3 font-medium">Acción (Simulada)</th>
                <th className="py-2 px-3 font-medium">Origen</th>
                <th className="py-2 px-3 font-medium">Latencia ACK</th>
                <th className="py-2 pl-3 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y font-mono ${
                darkMode ? "divide-slate-800" : "divide-slate-100"
              }`}
            >
              {eventos.slice(0, 10).map((ev) => {
                const confirmado =
                  Boolean(ev.confirmado_ack) ||
                  ev.estado_comando === "EJECUTADO_SIMULACION";
                return (
                  <tr key={ev.id}>
                    <td className={`py-2.5 pr-3 ${textMuted}`}>#{ev.id}</td>
                    <td className={`py-2.5 px-3 font-semibold uppercase ${textPrimary}`}>
                      {ev.zona_objetivo}
                    </td>
                    <td className={`py-2.5 px-3 ${textSecondary}`}>
                      {ev.angulo_servo}° • {ev.estado_ventilador ? "Fan ON" : "Fan OFF"}
                    </td>
                    <td className={`py-2.5 px-3 font-sans ${textSecondary}`}>
                      {ev.motivo}
                    </td>
                    <td className={`py-2.5 px-3 ${textSecondary}`}>
                      {ev.latencia_ms != null
                        ? `${Number(ev.latencia_ms).toFixed(0)} ms`
                        : "—"}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          confirmado
                            ? darkMode
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-green-100 text-green-800"
                            : darkMode
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {confirmado ? "Ejecutado (Sim)" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
