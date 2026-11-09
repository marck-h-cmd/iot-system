import React, { useEffect, useState } from "react";
import { Fan, X } from "lucide-react";
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
import { ZonaEstado } from "../types/iot";
import { fetchDetalleZonaApi } from "../services/api";

interface ZoneDetailModalProps {
  zonaId: string | null;
  zonaEstado: ZonaEstado | null;
  darkMode: boolean;
  ventiladorActivo: boolean;
  zonaObjetivoActual: string;
  onClose: () => void;
  onEnfriarZona: (zonaId: string, angulo: number, activar: boolean) => void;
}

export function ZoneDetailModal({
  zonaId,
  zonaEstado,
  darkMode,
  ventiladorActivo,
  zonaObjetivoActual,
  onClose,
  onEnfriarZona,
}: ZoneDetailModalProps) {
  const [historialZona, setHistorialZona] = useState<any[]>([]);
  const [eventosZona, setEventosZona] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zonaId) return;
    let mounted = true;
    setLoading(true);
    fetchDetalleZonaApi(zonaId, 35)
      .then((data) => {
        if (!mounted) return;
        const series = (data.historial || [])
          .slice()
          .reverse()
          .map((item: any) => ({
            hora: item.fecha_registro
              ? new Date(item.fecha_registro).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "",
            temperatura: Number(item.temperatura),
            prediccion: Number(item.prediccion_10m || item.temperatura),
          }));
        setHistorialZona(series);
        setEventosZona(data.eventos_recientes || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [zonaId]);

  if (!zonaId || !zonaEstado) return null;

  const isCoolingHere = ventiladorActivo && zonaObjetivoActual === zonaId;
  const angulo = zonaEstado.angulo_servo ?? 0;
  const textSecondary = darkMode ? "text-slate-300" : "text-slate-600";
  const subBox = darkMode
    ? "bg-[#19263B] border-slate-700"
    : "bg-slate-50 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-2xl rounded-xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto ${
          darkMode
            ? "bg-[#111C2E] border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-500/20">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{zonaEstado.nombre}</h3>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  darkMode
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {angulo}° • Simulación
              </span>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Sensor: {zonaEstado.sensor}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border ${
              darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                : "border-slate-200 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className={`p-3.5 rounded-lg border ${subBox}`}>
            <span className={`text-xs ${textSecondary}`}>Temperatura actual</span>
            <p className="text-xl font-semibold font-mono mt-1">
              {zonaEstado.disponible ? `${zonaEstado.temperatura.toFixed(1)} °C` : "Sin señal"}
            </p>
          </div>

          <div className={`p-3.5 rounded-lg border ${subBox}`}>
            <span className={`text-xs ${textSecondary}`}>Proyección +10 min</span>
            <p className="text-xl font-semibold font-mono mt-1">
              {zonaEstado.disponible ? `${zonaEstado.prediccion_10m.toFixed(1)} °C` : "—"}
            </p>
          </div>

          <div className={`p-3.5 rounded-lg border ${subBox}`}>
            <span className={`text-xs ${textSecondary}`}>Orientación servo</span>
            <p className="text-xl font-semibold font-mono mt-1">{angulo}°</p>
          </div>
        </div>

        {/* Gráfico histórico */}
        <div className={`p-4 rounded-lg border mb-4 ${subBox}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium">Historial térmico reciente</span>
            <span className={`text-xs font-mono ${textSecondary}`}>
              {loading ? "Cargando..." : `${historialZona.length} lecturas`}
            </span>
          </div>

          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historialZona}>
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
                <ReferenceLine y={35} stroke="#DC2626" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="temperatura"
                  name="Actual (°C)"
                  stroke={darkMode ? "#38BDF8" : "#2563EB"}
                  fill={darkMode ? "#38BDF8" : "#2563EB"}
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="prediccion"
                  name="Predicción +10m (°C)"
                  stroke={darkMode ? "#F59E0B" : "#B45309"}
                  fill="none"
                  strokeDasharray="4 3"
                  strokeWidth={1.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Control rápido de la estación */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border ${subBox}`}>
          <div>
            <p className="text-xs font-medium">Acción sobre esta computadora (Simulación)</p>
            <p className={`text-xs ${textSecondary}`}>
              Posiciona el servomotor simulado en {angulo}° y activa el ventilador.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEnfriarZona(zonaId, angulo, true)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                darkMode
                  ? "bg-sky-500 hover:bg-sky-400 text-slate-950"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Fan className={`w-3.5 h-3.5 ${isCoolingHere ? "animate-spin" : ""}`} />
              Enfriar estación ({angulo}°)
            </button>
            {isCoolingHere && (
              <button
                onClick={() => onEnfriarZona(zonaId, angulo, false)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                  darkMode
                    ? "border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                    : "border-red-300 text-red-700 hover:bg-red-50"
                }`}
              >
                Detener
              </button>
            )}
          </div>
        </div>

        {eventosZona.length > 0 && (
          <div className="mt-4">
            <h5 className={`text-xs font-medium mb-2 ${textSecondary}`}>
              Comandos recientes en esta estación
            </h5>
            <div className="space-y-1.5">
              {eventosZona.slice(0, 4).map((ev: any) => (
                <div
                  key={ev.id}
                  className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${subBox}`}
                >
                  <span>
                    {ev.motivo} • {ev.angulo_servo}°
                  </span>
                  <span className="font-mono">
                    {ev.latencia_ms != null ? `${Number(ev.latencia_ms).toFixed(0)} ms` : "Confirmado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
