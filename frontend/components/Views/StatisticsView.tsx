import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { EvidenciaHistorica, PruebasEstadisticasResponse } from "../../types/iot";

interface StatisticsViewProps {
  pruebasEstadisticas: PruebasEstadisticasResponse | null;
  evidencia: EvidenciaHistorica | null;
  darkMode: boolean;
  cardClass: string;
  subCardClass: string;
}

export function StatisticsView({
  pruebasEstadisticas,
  evidencia,
  darkMode,
  cardClass,
  subCardClass,
}: StatisticsViewProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleAnalysis = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pruebas = pruebasEstadisticas?.pruebas || [];
  const textPrimary = darkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = darkMode ? "text-slate-300" : "text-slate-600";
  const textMuted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
      {evidencia && (
        <section aria-labelledby="evidencia-historica">
          <h2 id="evidencia-historica" className={`mb-3 text-base font-semibold ${textPrimary}`}>Evidencia histórica del artículo</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <article className={`${cardClass} rounded-xl p-5`}>
              <h3 className="font-semibold">Prototipo físico</h3>
              <p className={`mt-2 text-2xl font-semibold ${textPrimary}`}>{evidencia.hardware.lecturas} lecturas</p>
              <ul className={`mt-2 space-y-1 text-xs ${textSecondary}`}>
                {evidencia.hardware.zonas.map((z) => (
                  <li key={z.zona}>{z.sensor} · {z.lecturas} lecturas · {z.minima}–{z.maxima} °C</li>
                ))}
              </ul>
              {evidencia.hardware.transiciones.map((t, i) => (
                <p key={i} className={`mt-3 text-xs ${textSecondary}`}>
                  {t.zona.toUpperCase()} · {t.antes.toFixed(1)} °C con el ventilador apagado y {t.inicio.toFixed(1)} °C en la primera lectura con encendido.
                  {t.posterior != null && ` La siguiente lectura fue de ${t.posterior.toFixed(1)} °C tras ${t.minutos_hasta_posterior} min.`}
                </p>
              ))}
            </article>
            <article className={`${cardClass} rounded-xl p-5`}>
              <h3 className="font-semibold">Órdenes simuladas</h3>
              <p className={`mt-2 text-2xl font-semibold ${textPrimary}`}>{evidencia.simulacion.eventos} eventos</p>
              <p className={`mt-2 text-xs ${textSecondary}`}>{evidencia.simulacion.por_modo.autonomo ?? 0} autónomos y {evidencia.simulacion.por_modo.manual ?? 0} manuales</p>
              <p className={`mt-2 text-xs ${textSecondary}`}>Latencia mediana registrada de {evidencia.simulacion.latencia_mediana_ms ?? "—"} ms.</p>
            </article>
            <article className={`${cardClass} rounded-xl p-5`}>
              <h3 className="font-semibold">Pares con origen físico sin verificar</h3>
              <p className={`mt-2 text-2xl font-semibold ${textPrimary}`}>{evidencia.pares.total} pares</p>
              <p className={`mt-2 text-xs ${textSecondary}`}>Caída media en el archivo de {evidencia.pares.caida_declarada_media_c?.toFixed(2) ?? "—"} °C.</p>
              <p className={`mt-2 text-xs ${textSecondary}`}>
                {evidencia.pares.inicios_coincidentes} valores iniciales coinciden con eventos simulados. Los valores finales carecen de trazabilidad a un sensor.
              </p>
            </article>
          </div>
        </section>
      )}
      {/* Resumen compacto superior */}
      <div
        className={`${cardClass} rounded-xl p-4 flex flex-wrap items-center justify-between gap-4`}
      >
        <div>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>
            Pruebas exploratorias en simulación (α = 0.05)
          </h2>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>
            Series del simulador MQTT evaluadas con SciPy. Las lecturas consecutivas pueden estar autocorrelacionadas.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className={`px-3 py-1.5 rounded-lg border ${subCardClass}`}>
            <span className={textSecondary}>Pruebas con muestra suficiente: </span>
            <strong className={`font-mono ${textPrimary}`}>
              {pruebasEstadisticas?.resumen_ejecutivo?.pruebas_con_muestra_suficiente ?? 0}{" "}
              / {pruebas.length || 4}
            </strong>
          </div>
        </div>
      </div>

      {/* Cuadrícula de resultados (4 tarjetas científicas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {pruebas.map((p) => {
          const isExpanded = Boolean(expandedIds[p.id]);
          const suficiente = p.suficiente;

          let badgeClass = darkMode
            ? "bg-slate-800 text-slate-300"
            : "bg-slate-100 text-slate-700";

          if (suficiente) {
            badgeClass = p.es_favorable
              ? darkMode
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-green-100 text-green-800"
              : darkMode
              ? "bg-amber-500/15 text-amber-300"
              : "bg-amber-100 text-amber-800";
          }

          return (
            <div
              key={p.id}
              className={`${cardClass} rounded-xl p-5 flex flex-col justify-between`}
            >
              <div>
                {/* Cabecera limpia de la prueba */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className={`text-xs font-mono ${textMuted}`}>
                      {p.id}
                    </span>
                    <h3 className={`text-base font-semibold mt-0.5 ${textPrimary}`}>
                      {p.nombre_corto || p.nombre_prueba}
                    </h3>
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>
                      {p.variable_evaluada}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${badgeClass}`}
                  >
                    {suficiente && p.es_favorable ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    {p.resultado_breve}
                  </span>
                </div>

                {/* 3 Métricas principales: Estadístico, p-valor, Muestra */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className={`p-3 rounded-lg border ${subCardClass}`}>
                    <span className={`text-xs block ${textSecondary}`}>
                      {p.estadistico_nombre}
                    </span>
                    <span className={`text-lg font-semibold font-mono mt-1 block ${textPrimary}`}>
                      {p.estadistico_valor != null ? p.estadistico_valor : "—"}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border ${subCardClass}`}>
                    <span className={`text-xs block ${textSecondary}`}>
                      p-valor
                    </span>
                    <span className={`text-lg font-semibold font-mono mt-1 block ${textPrimary}`}>
                      {p.p_valor != null
                        ? p.p_valor < 0.0001
                          ? "< 0.0001"
                          : p.p_valor.toFixed(4)
                        : "—"}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border ${subCardClass}`}>
                    <span className={`text-xs block ${textSecondary}`}>
                      Muestra (n)
                    </span>
                    <span className={`text-lg font-semibold font-mono mt-1 block ${textPrimary}`}>
                      {p.n_muestras}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pie con botón Ver análisis */}
              <div className="pt-3 border-t border-slate-500/15 flex items-center justify-between text-xs">
                <span className={textMuted}>
                  Mínimo requerido: n ≥ {p.minimo_requerido}
                </span>

                <button
                  onClick={() => toggleAnalysis(p.id)}
                  className={`inline-flex items-center gap-1 font-medium ${
                    darkMode
                      ? "text-sky-400 hover:text-sky-300"
                      : "text-blue-700 hover:text-blue-800"
                  }`}
                >
                  <span>{isExpanded ? "Ocultar análisis" : "Ver análisis"}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Divulgación progresiva de hipótesis, parámetros y conclusión */}
              {isExpanded && (
                <div
                  className={`mt-3 pt-3 border-t border-slate-500/15 space-y-2.5 text-xs ${textSecondary}`}
                >
                  <div className={`p-3 rounded-lg border space-y-1.5 ${subCardClass}`}>
                    <p>
                      <strong className={textPrimary}>Hipótesis nula (H₀): </strong>
                      {p.hipotesis_nula_h0}
                    </p>
                    <p>
                      <strong className={textPrimary}>Hipótesis alternativa (H₁): </strong>
                      {p.hipotesis_alternativa_h1}
                    </p>
                  </div>

                  {p.id === "STAT-01" && p.media_pre_enfriamiento_c != null && (
                    <p className="font-mono">
                      Media pre-enfriamiento: {p.media_pre_enfriamiento_c} °C → Media post-enfriamiento:{" "}
                      {p.media_post_enfriamiento_c} °C (ΔT = {p.reduccion_media_c} °C)
                    </p>
                  )}

                  {p.id === "STAT-02" && p.latencia_media_ms != null && (
                    <p className="font-mono">
                      Latencia media medida en simulación: {p.latencia_media_ms} ms (umbral: 200 ms)
                    </p>
                  )}

                  <p className="leading-relaxed">
                    <strong className={textPrimary}>Interpretación: </strong>
                    {p.conclusion}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
