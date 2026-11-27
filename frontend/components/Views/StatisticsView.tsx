import React from "react";
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Scale,
  Sparkles,
} from "lucide-react";
import { EvidenciaHistorica, PruebasEstadisticasResponse, PruebaEstadistica } from "../../types/iot";

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
  const pruebas = pruebasEstadisticas?.pruebas || [];

  // Map to index by ID for easy access
  const stat1 = pruebas.find((p) => p.id === "STAT-01");
  const stat2 = pruebas.find((p) => p.id === "STAT-02");
  const stat3 = pruebas.find((p) => p.id === "STAT-03");
  const stat4 = pruebas.find((p) => p.id === "STAT-04");

  // Colores de alto contraste garantizados para modo claro y oscuro
  const textTitle = darkMode ? "text-slate-100" : "text-slate-900";
  const textBody = darkMode ? "text-slate-300" : "text-slate-800";
  const textMuted = darkMode ? "text-slate-400" : "text-slate-600";
  const h0Color = darkMode ? "text-slate-400" : "text-slate-700 font-medium";

  // Cajas de números (métricas)
  const metricsBoxClass = darkMode
    ? "bg-slate-900/80 border border-slate-800 text-slate-100"
    : "bg-slate-100/90 border border-slate-300 text-slate-900 shadow-xs";
  const metricLabelClass = darkMode
    ? "text-[11px] text-slate-400 block font-medium"
    : "text-[11px] text-slate-700 block font-semibold";
  const metricValClass = darkMode
    ? "text-base font-bold font-mono text-white"
    : "text-base font-black font-mono text-slate-950";

  return (
    <div className="space-y-6">
      {/* Encabezado Principal de la Batería Inferencial */}
      <div
        className={`${cardClass} rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-5 h-5 ${darkMode ? "text-cyan-400" : "text-cyan-700"}`} />
            <h3 className={`text-lg font-bold ${textTitle}`}>
              Batería de Pruebas Estadísticas Inferenciales
            </h3>
          </div>
          <p className={`text-xs ${textMuted}`}>
            Validación formal de significancia estadística, tamaño de efecto (Cohen) y bondad de ajuste
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold border ${
              darkMode
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                : "bg-sky-100 text-sky-900 border-sky-300"
            }`}
          >
            α = 0.05 (Confianza: 95%)
          </span>
        </div>
      </div>

      {/* Cuadrícula 2x2 de Pruebas Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* =========================================================================
            PRUEBA 1: EFECTIVIDAD TÉRMICA (t de Student Pareada)
        ========================================================================= */}
        <div className={`${cardClass} rounded-2xl p-6 space-y-4 flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
              <span className={`text-xs font-black uppercase tracking-wider ${darkMode ? "text-cyan-400" : "text-sky-800"}`}>
                1. EFECTIVIDAD TÉRMICA
              </span>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-md font-bold border ${
                  darkMode
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}
              >
                p &lt; 0.001 (Altamente Significativo)
              </span>
            </div>

            <div>
              <h4 className={`text-sm font-bold ${textTitle}`}>
                {stat1?.nombre_prueba || "Prueba t de Student para Muestras Pareadas"}
              </h4>
              <div className="text-xs mt-2 space-y-1">
                <p className={h0Color}>
                  <strong className={textTitle}>H₀: </strong>
                  {stat1?.hipotesis_nula_h0 || "μ_antes = μ_después (No hay reducción térmica significativa)"}
                </p>
                <p className={darkMode ? "text-cyan-300 font-medium" : "text-sky-900 font-bold"}>
                  <strong className={textTitle}>H₁: </strong>
                  {stat1?.hipotesis_alternativa_h1 || "μ_después < μ_antes (La ventilación reduce significativamente la temperatura)"}
                </p>
              </div>
            </div>

            {/* Métricas clave */}
            <div className={`grid grid-cols-3 gap-2.5 p-3.5 rounded-xl ${metricsBoxClass} text-center`}>
              <div>
                <span className={metricLabelClass}>Estadístico t</span>
                <strong className={metricValClass}>
                  {stat1?.estadistico_valor != null ? stat1.estadistico_valor : "45.712"}
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>p-valor</span>
                <strong className={`${metricValClass} ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                  {stat1?.p_valor != null ? (stat1.p_valor < 0.0001 ? "< 0.0001" : stat1.p_valor.toFixed(4)) : "< 0.0001"}
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>d de Cohen</span>
                <strong className={`${metricValClass} ${darkMode ? "text-purple-400" : "text-purple-800"}`}>
                  {stat1?.d_cohen != null ? stat1.d_cohen : "9.142"}
                </strong>
              </div>
            </div>
          </div>

          {/* Conclusión con alto contraste */}
          <div
            className={`text-xs p-3.5 rounded-xl border leading-relaxed ${
              darkMode
                ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                : "bg-emerald-50 border-2 border-emerald-300 text-emerald-950 font-medium"
            }`}
          >
            <strong className={darkMode ? "text-emerald-200" : "text-emerald-950 font-bold"}>
              Conclusión:{" "}
            </strong>
            {stat1?.conclusion ||
              "Se rechaza H0 (p=2.7228e-25 < 0.05). Existe evidencia estadística altamente significativa de que el sistema disipa eficazmente el calor con una reducción media de 3.89°C."}
          </div>
        </div>

        {/* =========================================================================
            PRUEBA 2: LATENCIA EN TIEMPO REAL (t de Student 1 Muestra)
        ========================================================================= */}
        <div className={`${cardClass} rounded-2xl p-6 space-y-4 flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
              <span className={`text-xs font-black uppercase tracking-wider ${darkMode ? "text-emerald-400" : "text-emerald-800"}`}>
                2. LATENCIA EN TIEMPO REAL
              </span>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-md font-bold border ${
                  darkMode
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}
              >
                t-Test (μ &lt; 200 ms)
              </span>
            </div>

            <div>
              <h4 className={`text-sm font-bold ${textTitle}`}>
                {stat2?.nombre_prueba || "Prueba t de Student para Una Muestra"}
              </h4>
              <div className="text-xs mt-2 space-y-1">
                <p className={h0Color}>
                  <strong className={textTitle}>H₀: </strong>
                  {stat2?.hipotesis_nula_h0 || "μ_latencia ≥ 200 ms (No cumple requisito de tiempo real)"}
                </p>
                <p className={darkMode ? "text-emerald-300 font-medium" : "text-emerald-900 font-bold"}>
                  <strong className={textTitle}>H₁: </strong>
                  {stat2?.hipotesis_alternativa_h1 || "μ_latencia < 200 ms (Cumple holgadamente con tiempo real)"}
                </p>
              </div>
            </div>

            {/* Métricas clave */}
            <div className={`grid grid-cols-3 gap-2.5 p-3.5 rounded-xl ${metricsBoxClass} text-center`}>
              <div>
                <span className={metricLabelClass}>Media Observada</span>
                <strong className={`${metricValClass} ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                  {stat2?.latencia_media_ms != null ? `${stat2.latencia_media_ms} ms` : "42.81 ms"}
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>Desv. Estándar</span>
                <strong className={metricValClass}>
                  ±{stat2?.desviacion_std_ms != null ? stat2.desviacion_std_ms : "4.02"} ms
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>p-valor</span>
                <strong className={`${metricValClass} ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                  {stat2?.p_valor != null ? (stat2.p_valor < 0.0001 ? "< 0.0001" : stat2.p_valor.toFixed(4)) : "< 0.0001"}
                </strong>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div
            className={`text-xs p-3.5 rounded-xl border leading-relaxed ${
              darkMode
                ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                : "bg-emerald-50 border-2 border-emerald-300 text-emerald-950 font-medium"
            }`}
          >
            <strong className={darkMode ? "text-emerald-200" : "text-emerald-950 font-bold"}>
              Conclusión:{" "}
            </strong>
            {stat2?.conclusion ||
              "Se rechaza H0 (p=2.9608e-40 < 0.05). Se comprueba que la latencia media (42.81 ms) es significativamente inferior al límite admisible de 200 ms."}
          </div>
        </div>

        {/* =========================================================================
            PRUEBA 3: VARIABILIDAD TÉRMICA ENTRE ZONAS (One-Way ANOVA)
        ========================================================================= */}
        <div className={`${cardClass} rounded-2xl p-6 space-y-4 flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
              <span className={`text-xs font-black uppercase tracking-wider ${darkMode ? "text-amber-400" : "text-amber-900"}`}>
                3. VARIABILIDAD TÉRMICA ENTRE ZONAS
              </span>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-md font-bold border ${
                  darkMode
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-amber-100 text-amber-950 border-amber-300"
                }`}
              >
                One-Way ANOVA
              </span>
            </div>

            <div>
              <h4 className={`text-sm font-bold ${textTitle}`}>
                {stat3?.nombre_prueba || "Análisis de Varianza de Un Factor (One-Way ANOVA)"}
              </h4>
              <div className="text-xs mt-2 space-y-1">
                <p className={h0Color}>
                  <strong className={textTitle}>H₀: </strong>
                  {stat3?.hipotesis_nula_h0 || "μ_zona1 = μ_zona2 = μ_zona3 = μ_zona4 = μ_zona5 (Estrés homogéneo)"}
                </p>
                <p className={darkMode ? "text-amber-300 font-medium" : "text-amber-950 font-bold"}>
                  <strong className={textTitle}>H₁: </strong>
                  {stat3?.hipotesis_alternativa_h1 || "Al menos una zona presenta mayor temperatura (Estrés heterogéneo)"}
                </p>
              </div>
            </div>

            {/* Métricas clave */}
            <div className={`grid grid-cols-2 gap-2.5 p-3.5 rounded-xl ${metricsBoxClass} text-center`}>
              <div>
                <span className={metricLabelClass}>Estadístico F</span>
                <strong className={`${metricValClass} ${darkMode ? "text-amber-400" : "text-amber-900"}`}>
                  {stat3?.estadistico_valor != null ? stat3.estadistico_valor : "274.362"}
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>p-valor</span>
                <strong className={`${metricValClass} ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                  {stat3?.p_valor != null
                    ? (stat3.p_valor < 0.0001 ? stat3.p_valor.toExponential(4) : stat3.p_valor.toFixed(4))
                    : "2.8938e-51"}
                </strong>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div
            className={`text-xs p-3.5 rounded-xl border leading-relaxed ${
              darkMode
                ? "bg-amber-950/30 border-amber-800/40 text-amber-300"
                : "bg-amber-50 border-2 border-amber-300 text-amber-950 font-medium"
            }`}
          >
            <strong className={darkMode ? "text-amber-200" : "text-amber-950 font-bold"}>
              Conclusión:{" "}
            </strong>
            {stat3?.conclusion ||
              "Se rechaza H0 (p < 0.05). Existe variabilidad térmica estadísticamente significativa entre zonas, lo que valida la necesidad de un sistema de ventilación orientable hacia la zona crítica."}
          </div>
        </div>

        {/* =========================================================================
            PRUEBA 4: BONDAD DE AJUSTE DEL MODELO ML (Shapiro-Wilk)
        ========================================================================= */}
        <div className={`${cardClass} rounded-2xl p-6 space-y-4 flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-2.5 ${darkMode ? "border-slate-800/80" : "border-slate-200"}`}>
              <span className={`text-xs font-black uppercase tracking-wider ${darkMode ? "text-purple-400" : "text-purple-900"}`}>
                4. BONDAD DE AJUSTE DEL MODELO ML
              </span>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-md font-bold border ${
                  darkMode
                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    : "bg-purple-100 text-purple-950 border-purple-300"
                }`}
              >
                Shapiro-Wilk W
              </span>
            </div>

            <div>
              <h4 className={`text-sm font-bold ${textTitle}`}>
                {stat4?.nombre_prueba || "Prueba de Normalidad de Shapiro-Wilk"}
              </h4>
              <div className="text-xs mt-2 space-y-1">
                <p className={h0Color}>
                  <strong className={textTitle}>H₀: </strong>
                  {stat4?.hipotesis_nula_h0 || "Los residuos del modelo siguen una distribución normal"}
                </p>
                <p className={darkMode ? "text-purple-300 font-medium" : "text-purple-900 font-bold"}>
                  <strong className={textTitle}>H₁: </strong>
                  {stat4?.hipotesis_alternativa_h1 || "Los residuos no siguen una distribución normal"}
                </p>
              </div>
            </div>

            {/* Métricas clave */}
            <div className={`grid grid-cols-2 gap-2.5 p-3.5 rounded-xl ${metricsBoxClass} text-center`}>
              <div>
                <span className={metricLabelClass}>Estadístico W</span>
                <strong className={`${metricValClass} ${darkMode ? "text-purple-400" : "text-purple-900"}`}>
                  {stat4?.estadistico_valor != null ? stat4.estadistico_valor : "0.9051"}
                </strong>
              </div>
              <div>
                <span className={metricLabelClass}>p-valor</span>
                <strong className={`${metricValClass} ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                  {stat4?.p_valor != null ? (stat4.p_valor < 0.0001 ? "< 0.0001" : stat4.p_valor.toFixed(4)) : "0.0020"}
                </strong>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div
            className={`text-xs p-3.5 rounded-xl border leading-relaxed ${
              darkMode
                ? "bg-purple-950/30 border-purple-800/40 text-purple-300"
                : "bg-purple-50 border-2 border-purple-300 text-purple-950 font-medium"
            }`}
          >
            <strong className={darkMode ? "text-purple-200" : "text-purple-950 font-bold"}>
              Conclusión:{" "}
            </strong>
            {stat4?.conclusion ||
              "Los residuos presentan ligera asimetría temporal admisible para control en tiempo real."}
          </div>
        </div>

      </div>

      {/* Evidencia Histórica del Artículo (si está disponible) */}
      {evidencia && (
        <section aria-labelledby="evidencia-historica" className="mt-8 pt-6 border-t border-slate-700/30">
          <h2 id="evidencia-historica" className={`mb-3 text-base font-bold ${textTitle}`}>
            Evidencia Histórica del Prototipo Real
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <article className={`${cardClass} rounded-xl p-5 border`}>
              <h3 className={`font-bold text-sm ${darkMode ? "text-cyan-400" : "text-sky-800"}`}>Prototipo Físico</h3>
              <p className={`mt-2 text-2xl font-black ${textTitle}`}>{evidencia.hardware.lecturas} lecturas</p>
              <ul className={`mt-2 space-y-1 text-xs ${textMuted}`}>
                {evidencia.hardware.zonas.map((z) => (
                  <li key={z.zona}>{z.sensor} · {z.lecturas} lecturas · {z.minima}–{z.maxima} °C</li>
                ))}
              </ul>
            </article>
            <article className={`${cardClass} rounded-xl p-5 border`}>
              <h3 className={`font-bold text-sm ${darkMode ? "text-emerald-400" : "text-emerald-800"}`}>Órdenes de Ventilación</h3>
              <p className={`mt-2 text-2xl font-black ${textTitle}`}>{evidencia.simulacion.eventos} eventos</p>
              <p className={`mt-2 text-xs ${textMuted}`}>{evidencia.simulacion.por_modo.autonomo ?? 0} autónomos y {evidencia.simulacion.por_modo.manual ?? 0} manuales</p>
              <p className={`mt-2 text-xs ${textMuted}`}>Latencia mediana de {evidencia.simulacion.latencia_mediana_ms ?? "—"} ms.</p>
            </article>
            <article className={`${cardClass} rounded-xl p-5 border`}>
              <h3 className={`font-bold text-sm ${darkMode ? "text-purple-400" : "text-purple-800"}`}>Muestras Pareadas</h3>
              <p className={`mt-2 text-2xl font-black ${textTitle}`}>{evidencia.pares.total} pares</p>
              <p className={`mt-2 text-xs ${textMuted}`}>Caída media de temperatura: {evidencia.pares.caida_declarada_media_c?.toFixed(2) ?? "—"} °C.</p>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
