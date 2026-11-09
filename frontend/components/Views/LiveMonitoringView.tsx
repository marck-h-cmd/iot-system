import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Compass,
  Fan,
  Thermometer,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  AlertaActiva,
  EstadoActualResponse,
  EventoControl,
  IndicadoresResponse,
} from "../../types/iot";
import { OrientationRadar } from "../OrientationRadar";

interface LiveMonitoringViewProps {
  estadoActual: EstadoActualResponse | null;
  indicadores: IndicadoresResponse | null;
  eventos: EventoControl[];
  alertas: AlertaActiva[];
  chartHistory: any[];
  zonaSeleccionadaChart: string;
  setZonaSeleccionadaChart: (z: string) => void;
  darkMode: boolean;
  cardClass: string;
  subCardClass: string;
  onSelectZonaModal: (zonaId: string) => void;
  onQuickCoolZona: (zonaId: string, angulo: number, fanOn: boolean) => void;
}

export function LiveMonitoringView({
  estadoActual,
  indicadores,
  eventos,
  alertas,
  chartHistory,
  zonaSeleccionadaChart,
  setZonaSeleccionadaChart,
  darkMode,
  cardClass,
  subCardClass,
  onSelectZonaModal,
}: LiveMonitoringViewProps) {
  const [alertasExpandidas, setAlertasExpandidas] = useState(false);

  const zonasEntries = estadoActual?.zonas
    ? Object.entries(estadoActual.zonas).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const zonasDisponibles = zonasEntries.filter(([, z]) => z.disponible !== false);

  let maxTemp = 0;
  let maxZonaNombre = "PC 1";
  for (const [zKey, z] of zonasDisponibles) {
    if (z.temperatura > maxTemp) {
      maxTemp = z.temperatura;
      maxZonaNombre = z.nombre || zKey.toUpperCase();
    }
  }

  const avgTemp =
    zonasDisponibles.length > 0
      ? zonasDisponibles.reduce((acc, [, z]) => acc + z.temperatura, 0) /
        zonasDisponibles.length
      : 0;

  const zonaActivaId = estadoActual?.zona_objetivo_actual || "zona1";
  const zonaActivaObj = estadoActual?.zonas?.[zonaActivaId];
  const zonaActivaLabel =
    zonaActivaObj?.nombre || `PC ${zonaActivaId.replace("zona", "")}`;

  const textPrimary = darkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = darkMode ? "text-slate-300" : "text-slate-600";
  const textMuted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
      {/* Alertas compactas y expandibles */}
      {alertas.length > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 transition-all ${
            darkMode
              ? "bg-rose-950/35 border-rose-500/40 text-slate-100"
              : "bg-red-50 border-red-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  darkMode ? "text-rose-400" : "text-red-600"
                }`}
              />
              <span className="text-xs font-semibold truncate">
                {alertas[0].estacion}: {alertas[0].mensaje}
              </span>
              {alertas.length > 1 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                    darkMode
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  +{alertas.length - 1} más
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onSelectZonaModal(alertas[0].zona_id)}
                className={`text-xs font-medium underline ${
                  darkMode ? "text-rose-300" : "text-red-700"
                }`}
              >
                Ver estación
              </button>
              {alertas.length > 1 && (
                <button
                  onClick={() => setAlertasExpandidas(!alertasExpandidas)}
                  className={`p-1 rounded hover:bg-black/10 ${textSecondary}`}
                  aria-label="Expandir alertas"
                >
                  {alertasExpandidas ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {alertasExpandidas && alertas.length > 1 && (
            <div className="mt-2.5 pt-2.5 border-t border-rose-500/20 space-y-1.5">
              {alertas.slice(1).map((al) => (
                <div
                  key={al.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    <strong>{al.estacion}:</strong> {al.mensaje}
                  </span>
                  <button
                    onClick={() => onSelectZonaModal(al.zona_id)}
                    className="underline font-medium ml-2"
                  >
                    Inspeccionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fila de 4 métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Temperatura máxima */}
        <div className={`${cardClass} p-4 rounded-xl`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>
              Temperatura máxima
            </span>
            <Thermometer
              className={`w-4 h-4 ${
                maxTemp >= 35
                  ? darkMode
                    ? "text-rose-400"
                    : "text-red-600"
                  : darkMode
                  ? "text-sky-400"
                  : "text-blue-600"
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono">
            <span
              className={`text-2xl font-semibold ${
                maxTemp >= 35
                  ? darkMode
                    ? "text-rose-400"
                    : "text-red-600"
                  : textPrimary
              }`}
            >
              {maxTemp.toFixed(1)} °C
            </span>
          </div>
          <p className={`text-xs mt-1 ${textMuted}`}>
            Registrada en {maxZonaNombre}
          </p>
        </div>

        {/* 2. Temperatura promedio */}
        <div className={`${cardClass} p-4 rounded-xl`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>
              Temperatura promedio
            </span>
            <Activity
              className={`w-4 h-4 ${darkMode ? "text-sky-400" : "text-cyan-700"}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono">
            <span className={`text-2xl font-semibold ${textPrimary}`}>
              {avgTemp.toFixed(1)} °C
            </span>
          </div>
          <p className={`text-xs mt-1 ${textMuted}`}>
            {zonasDisponibles.length} de 5 estaciones con señal
          </p>
        </div>

        {/* 3. Estado del ventilador */}
        <div className={`${cardClass} p-4 rounded-xl`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>
              Estado del ventilador
            </span>
            <Fan
              className={`w-4 h-4 ${
                estadoActual?.ventilador_activo
                  ? darkMode
                    ? "text-sky-400 animate-spin"
                    : "text-blue-600 animate-spin"
                  : textMuted
              }`}
            />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-semibold ${
                estadoActual?.ventilador_activo
                  ? darkMode
                    ? "text-sky-400"
                    : "text-blue-600"
                  : textPrimary
              }`}
            >
              {estadoActual?.ventilador_activo ? "Encendido" : "En espera"}
            </span>
          </div>
          <p className={`text-xs mt-1 ${textMuted}`}>
            Ahorro estimado:{" "}
            {indicadores?.ahorro_energetico_estimado_pct?.toFixed(1) ?? "0.0"}%
          </p>
        </div>

        {/* 4. Zona activa */}
        <div className={`${cardClass} p-4 rounded-xl`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${textSecondary}`}>
              Zona activa
            </span>
            <Compass
              className={`w-4 h-4 ${
                darkMode ? "text-sky-400" : "text-cyan-700"
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-semibold ${textPrimary}`}>
              {zonaActivaLabel}
            </span>
            <span className={`text-sm font-mono font-medium ${textSecondary}`}>
              ({estadoActual?.ultimo_angulo_servo ?? 90}°)
            </span>
          </div>
          <p className={`text-xs mt-1 ${textMuted}`}>
            Orientación simulada del servomotor
          </p>
        </div>
      </div>

      {/* Zona central: Gráfica térmica protagonista + Panel lateral con las 5 temperaturas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfica térmica protagonista (8 columnas) */}
        <div className={`lg:col-span-8 ${cardClass} rounded-xl p-5 flex flex-col justify-between`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                Evolución térmica y proyección (+10 min)
              </h2>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Temperatura observada frente a predicción lineal y umbral crítico (35.0 °C)
              </p>
            </div>

            <div
              className={`inline-flex p-1 rounded-lg border ${
                darkMode
                  ? "bg-[#0B1220] border-slate-700"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              {["zona1", "zona2", "zona3", "zona4", "zona5"].map((z, idx) => {
                const active = zonaSeleccionadaChart === z;
                return (
                  <button
                    key={z}
                    onClick={() => setZonaSeleccionadaChart(z)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? darkMode
                          ? "bg-sky-500 text-slate-950 font-semibold"
                          : "bg-white text-slate-900 shadow-xs font-semibold"
                        : textSecondary
                    }`}
                  >
                    PC {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartHistory}
                margin={{ top: 10, right: 12, left: -14, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={darkMode ? "#38BDF8" : "#2563EB"}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={darkMode ? "#38BDF8" : "#2563EB"}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={darkMode ? "#334155" : "#E2E8F0"}
                  vertical={false}
                />
                <XAxis
                  dataKey="hora"
                  stroke={darkMode ? "#94A3B8" : "#475569"}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={darkMode ? "#94A3B8" : "#475569"}
                  fontSize={11}
                  domain={[18, 46]}
                  tickLine={false}
                  unit="°"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#111C2E" : "#FFFFFF",
                    borderColor: darkMode ? "#334155" : "#E2E8F0",
                    color: darkMode ? "#F8FAFC" : "#0F172A",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={35}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{
                    position: "insideTopLeft",
                    value: "Umbral 35.0 °C",
                    fill: darkMode ? "#F87171" : "#DC2626",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temperatura"
                  name="Actual (°C)"
                  stroke={darkMode ? "#38BDF8" : "#2563EB"}
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#tempFill)"
                />
                <Area
                  type="monotone"
                  dataKey="prediccion"
                  name="Proyección +10m (°C)"
                  stroke={darkMode ? "#F59E0B" : "#B45309"}
                  strokeWidth={1.8}
                  strokeDasharray="5 3"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel lateral con las 5 computadoras (4 columnas) */}
        <div className={`lg:col-span-4 ${cardClass} rounded-xl p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                Computadoras (5 zonas)
              </h2>
              <span className={`text-xs ${textMuted}`}>
                Clic para detalles
              </span>
            </div>

            <div className="space-y-2.5">
              {zonasEntries.map(([zKey, zData]) => {
                const sinSenal = zData.disponible === false;
                const isCrit = !sinSenal && zData.temperatura >= 35.0;
                const isWarn =
                  !sinSenal &&
                  !isCrit &&
                  (zData.temperatura >= 33.0 || zData.prediccion_10m >= 35.0);
                const isCoolingHere =
                  estadoActual?.ventilador_activo &&
                  estadoActual?.zona_objetivo_actual === zKey;

                let badgeClass = darkMode
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-green-100 text-green-800";
                let badgeLabel = "Normal";

                if (sinSenal) {
                  badgeClass = darkMode
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-200 text-slate-700";
                  badgeLabel = "Sin señal";
                } else if (isCrit) {
                  badgeClass = darkMode
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-red-100 text-red-800";
                  badgeLabel = "Crítico";
                } else if (isWarn) {
                  badgeClass = darkMode
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-amber-100 text-amber-800";
                  badgeLabel = "Atención";
                }

                return (
                  <button
                    key={zKey}
                    onClick={() => onSelectZonaModal(zKey)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${subCardClass} ${
                      darkMode
                        ? "hover:border-sky-500/50"
                        : "hover:border-blue-400"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${textPrimary}`}>
                          {zData.nombre}
                        </span>
                        <span className={`text-xs font-mono ${textMuted}`}>
                          {zData.angulo_servo}°
                        </span>
                        {isCoolingHere && (
                          <Fan
                            className={`w-3.5 h-3.5 animate-spin ${
                              darkMode ? "text-sky-400" : "text-blue-600"
                            }`}
                          />
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${textSecondary}`}>
                        {sinSenal
                          ? "Sonda sin respuesta"
                          : `Proyección +10m: ${zData.prediccion_10m.toFixed(1)} °C`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-base font-semibold font-mono ${textPrimary}`}>
                        {sinSenal ? "—" : `${zData.temperatura.toFixed(1)} °C`}
                      </div>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Zona inferior: Visualización compacta del radar + Historial de actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar compacto (5 columnas) */}
        <div className={`lg:col-span-5 ${cardClass} rounded-xl p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                Orientación del servomotor
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Representación simulada (0° a 180°)
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                estadoActual?.ventilador_activo
                  ? darkMode
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-blue-50 text-blue-700"
                  : darkMode
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {estadoActual?.ultimo_angulo_servo ?? 90}°
            </span>
          </div>

          <OrientationRadar
            estadoActual={estadoActual}
            darkMode={darkMode}
            interactive={false}
          />
        </div>

        {/* Historial de actividad reciente (7 columnas) */}
        <div className={`lg:col-span-7 ${cardClass} rounded-xl p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className={`text-sm font-semibold ${textPrimary}`}>
                  Actividad reciente
                </h2>
                <p className={`text-xs ${textSecondary}`}>
                  Últimas órdenes de control y confirmaciones del simulador
                </p>
              </div>
              <span className={`text-xs font-mono ${textMuted}`}>
                Latencia ACK:{" "}
                {estadoActual?.latencia_ultima_ms != null
                  ? `${Number(estadoActual.latencia_ultima_ms).toFixed(0)} ms`
                  : "—"}
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
                    <th className="py-2 pr-3 font-medium">Zona</th>
                    <th className="py-2 px-3 font-medium">Acción</th>
                    <th className="py-2 px-3 font-medium">Origen</th>
                    <th className="py-2 px-3 font-medium">Disparo</th>
                    <th className="py-2 pl-3 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    darkMode ? "divide-slate-800" : "divide-slate-100"
                  }`}
                >
                  {eventos.slice(0, 5).map((ev) => {
                    const confirmado =
                      Boolean(ev.confirmado_ack) ||
                      ev.estado_comando === "EJECUTADO_SIMULACION";
                    return (
                      <tr key={ev.id}>
                        <td className={`py-2.5 pr-3 font-semibold uppercase ${textPrimary}`}>
                          {ev.zona_objetivo}
                        </td>
                        <td className={`py-2.5 px-3 font-mono ${textSecondary}`}>
                          {ev.angulo_servo}° • {ev.estado_ventilador ? "Fan ON" : "Fan OFF"}
                        </td>
                        <td className={`py-2.5 px-3 ${textSecondary}`}>
                          {ev.motivo}
                        </td>
                        <td className={`py-2.5 px-3 font-mono ${textSecondary}`}>
                          {Number(ev.temperatura_disparo).toFixed(1)} °C
                        </td>
                        <td className="py-2.5 pl-3 text-right">
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
                            {confirmado ? "Confirmado (Sim)" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {eventos.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className={`py-6 text-center ${textMuted}`}
                      >
                        Sin comandos registrados en esta sesión.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
