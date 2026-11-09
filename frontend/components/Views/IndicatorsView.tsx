import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import {
  IndicadoresDetalladosResponse,
  IndicadoresResponse,
} from "../../types/iot";

interface IndicatorsViewProps {
  indicadores: IndicadoresResponse | null;
  indicadoresDetallados: IndicadoresDetalladosResponse | null;
  darkMode: boolean;
  cardClass: string;
  subCardClass: string;
}

export function IndicatorsView({
  indicadores,
  indicadoresDetallados,
  darkMode,
  cardClass,
  subCardClass,
}: IndicatorsViewProps) {
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

  const toggleDetails = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const dimensiones = indicadoresDetallados?.dimensiones || [];
  const allInds = dimensiones.flatMap((d) => d.indicadores);
  const cumplidosCount = allInds.filter(
    (i) => i.estado_meta === "cumplida"
  ).length;

  const textPrimary = darkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = darkMode ? "text-slate-300" : "text-slate-600";
  const textMuted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
      {/* Resumen compacto superior */}
      <div className={`${cardClass} rounded-xl p-4 flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>
            Resumen de indicadores operacionales
          </h2>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>
            8 indicadores distribuidos en 4 dimensiones • Datos en modo simulación
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className={`px-3 py-1.5 rounded-lg border ${subCardClass}`}>
            <span className={textSecondary}>Metas alcanzadas: </span>
            <strong className={`font-mono ${textPrimary}`}>
              {cumplidosCount} / {allInds.length || 8}
            </strong>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border ${subCardClass}`}>
            <span className={textSecondary}>Muestras totales: </span>
            <strong className={`font-mono ${textPrimary}`}>
              {indicadores?.total_lecturas ?? 0}
            </strong>
          </div>
        </div>
      </div>

      {/* Cuatro secciones organizadas en tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {dimensiones.map((dim) => (
          <div key={dim.id} className={`${cardClass} rounded-xl p-5 flex flex-col`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-500/15">
              <div>
                <span
                  className={`text-xs font-medium ${
                    darkMode ? "text-sky-400" : "text-blue-700"
                  }`}
                >
                  {dim.id}
                </span>
                <h3 className={`text-base font-semibold mt-0.5 ${textPrimary}`}>
                  {dim.dimension}
                </h3>
              </div>
              <span className={`text-xs ${textMuted}`}>
                {dim.indicadores.length} indicadores
              </span>
            </div>

            <div className="space-y-3">
              {dim.indicadores.map((ind) => {
                const isExpanded = Boolean(expandedCodes[ind.codigo]);

                let statusBadgeClass = darkMode
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-slate-100 text-slate-600 border border-slate-200";
                let statusText = ind.etiqueta_meta || "Sin datos suficientes";
                let StatusIcon = Clock;

                if (ind.estado_meta === "cumplida") {
                  statusBadgeClass = darkMode
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-green-100 text-green-800 border border-green-200";
                  statusText = "Meta cumplida";
                  StatusIcon = CheckCircle2;
                } else if (ind.estado_meta === "no_cumple") {
                  statusBadgeClass = darkMode
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-amber-100 text-amber-800 border border-amber-200";
                  statusText = "No cumple";
                  StatusIcon = AlertCircle;
                } else if (ind.estado_meta === "sin_meta_definida") {
                  statusBadgeClass = darkMode
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-200";
                  statusText = "Sin meta definida";
                  StatusIcon = Clock;
                } else {
                  statusText = "Sin datos suficientes";
                  StatusIcon = Clock;
                }

                return (
                  <div
                    key={ind.codigo}
                    className={`rounded-lg border p-3.5 transition-all ${subCardClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-medium ${textMuted}`}>
                            {ind.codigo}
                          </span>
                          <h4 className={`text-sm font-semibold ${textPrimary}`}>
                            {ind.indicador}
                          </h4>
                        </div>
                        <p className={`text-xs mt-1 ${textSecondary}`}>
                          Meta: <span className="font-mono font-medium">{ind.meta}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xl font-semibold font-mono ${textPrimary}`}>
                          {ind.valor != null ? ind.valor : "—"}
                          {ind.valor != null && ind.unidad && (
                            <span className={`text-xs font-normal ml-1 ${textSecondary}`}>
                              {ind.unidad}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso únicamente cuando tiene significado cuantitativo (0-100%) */}
                    {ind.progreso_pct !== null && (
                      <div className="mt-2.5">
                        <div
                          className={`w-full h-1.5 rounded-full overflow-hidden ${
                            darkMode ? "bg-slate-800" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ind.estado_meta === "cumplida"
                                ? darkMode
                                  ? "bg-emerald-400"
                                  : "bg-green-600"
                                : darkMode
                                ? "bg-amber-400"
                                : "bg-amber-600"
                            }`}
                            style={{ width: `${ind.progreso_pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pie compacto con Estado real y botón Detalles */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-500/15 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${statusBadgeClass}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusText}
                      </span>

                      <button
                        onClick={() => toggleDetails(ind.codigo)}
                        className={`inline-flex items-center gap-1 font-medium ${
                          darkMode
                            ? "text-sky-400 hover:text-sky-300"
                            : "text-blue-700 hover:text-blue-800"
                        }`}
                      >
                        <span>Detalles</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Divulgación progresiva de la metodología e interpretación */}
                    {isExpanded && (
                      <div
                        className={`mt-2.5 pt-2.5 border-t border-slate-500/15 text-xs space-y-1.5 ${textSecondary}`}
                      >
                        {ind.descripcion && (
                          <p>
                            <strong className={textPrimary}>Definición: </strong>
                            {ind.descripcion}
                          </p>
                        )}
                        <p>
                          <strong className={textPrimary}>Interpretación: </strong>
                          {ind.interpretacion}
                        </p>
                        {ind.muestras != null && (
                          <p className={`font-mono text-[11px] ${textMuted}`}>
                            Muestras evaluadas: n = {ind.muestras}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
