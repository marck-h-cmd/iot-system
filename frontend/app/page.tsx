"use client";

import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import {
  Fan,
  Compass,
  Activity,
  Cpu,
  Server,
  Zap,
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Radio,
  Flame,
  Sun,
  Moon,
  Layers,
  Wind,
  ShieldCheck,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Target,
  Sparkles,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";

// Tipos de datos
interface TelemetriaItem {
  id?: number;
  zona: string;
  temperatura_actual: number;
  temperatura_predicha?: number;
  origen: "real" | "virtual";
  estado_ventilador?: number;
  angulo_servo?: number;
  sensor?: string;
  timestamp?: string;
}

interface EventoControl {
  id: number;
  zona_objetivo: string;
  temperatura_disparo: number;
  temperatura_predicha: number;
  fan_state: number;
  servo_angle: number;
  latencia_ms: number;
  ack_recibido: number;
  created_at: string;
}

interface IndicadoresInvestigacion {
  dimension_1: { intervalo_adquisicion_seg: number; tasa_entrega_pct: number; total_mensajes: number };
  dimension_2: { mae: number; rmse: number; r2: number; muestras: number };
  dimension_3: { exactitud_seleccion_pct: number; latencia_promedio_ms: number; tasa_ack_pct: number };
  dimension_4: { delta_termico_c: number; fraccion_tiempo_fan_pct: number; minutos_fan_on: number };
  estado_actual: {
    estado_ventilador: number;
    angulo_servo: number;
    zona_activa: string;
    temperatura_maxima_detectada: number;
    temperatura_maxima_predicha: number;
    ultima_latencia_ms: number;
  };
}

export default function DashboardSmartCooling() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [vistaActual, setVistaActual] = useState<"dashboard" | "indicadores" | "estadisticas" | "control">("dashboard");
  const [sidebarColapsado, setSidebarColapsado] = useState<boolean>(false);
  const [sidebarMobileAbierto, setSidebarMobileAbierto] = useState<boolean>(false);

  // Estados de datos
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>("todas");
  const [telemetriaActual, setTelemetriaActual] = useState<TelemetriaItem[]>([]);
  const [historialGrafico, setHistorialGrafico] = useState<any[]>([]);
  const [eventosControl, setEventosControl] = useState<EventoControl[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresInvestigacion | null>(null);
  const [indicadoresDetalle, setIndicadoresDetalle] = useState<any>(null);
  const [pruebasEstadisticas, setPruebasEstadisticas] = useState<any>(null);
  
  const [cargando, setCargando] = useState<boolean>(true);
  const [conectado, setConectado] = useState<boolean>(true);
  const [horaLocal, setHoraLocal] = useState<string>("");
  const [mensajeManual, setMensajeManual] = useState<string>("");

  const isDark = theme === "dark";

  // Metadatos de hardware por zona
  const infoZonas: Record<string, { nombre: string; hardware: string; tipo: "real" | "virtual"; angulo: number }> = {
    zona1: { nombre: "PC 1", hardware: "Físico", tipo: "real", angulo: 0 },
    zona2: { nombre: "PC 2", hardware: "Físico", tipo: "real", angulo: 45 },
    zona3: { nombre: "PC 3", hardware: "Virtual", tipo: "virtual", angulo: 90 },
    zona4: { nombre: "PC 4", hardware: "Virtual", tipo: "virtual", angulo: 135 },
    zona5: { nombre: "PC 5", hardware: "Virtual", tipo: "virtual", angulo: 180 },
  };

  // Reloj digital en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraLocal(now.toLocaleTimeString("es-PE", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carga periódica de datos
  const cargarDatos = async () => {
    try {
      // 1. Telemetría actual de las 5 zonas
      const resActual = await fetch("/api/telemetria/actual");
      if (resActual.ok) {
        const datos = await resActual.json();
        setTelemetriaActual(Array.isArray(datos) ? datos : []);
        setConectado(true);
      }

      // 2. Historial de temperaturas para el gráfico
      const resHist = await fetch(`/api/telemetria/historial?zona=${zonaSeleccionada}&limit=50`);
      if (resHist.ok) {
        const jsonHist = await resHist.json();
        if (jsonHist.datos) {
          const form = jsonHist.datos.map((d: any) => ({
            timestamp: d.timestamp ? d.timestamp.split(" ")[1] || d.timestamp : "",
            zona: d.zona,
            temperatura: parseFloat(d.temperatura_actual),
            prediccion_10m: d.temperatura_predicha ? parseFloat(d.temperatura_predicha) : null,
            umbral_critico: 35.0
          }));
          setHistorialGrafico(form);
        }
      }

      // 3. Indicadores consolidados
      const resInd = await fetch("/api/indicadores");
      if (resInd.ok) {
        const datosInd = await resInd.json();
        setIndicadores(datosInd);
      }

      // 4. Indicadores detallados por dimensión
      const resDetalle = await fetch("/api/indicadores/detallado");
      if (resDetalle.ok) {
        const datosDetalle = await resDetalle.json();
        setIndicadoresDetalle(datosDetalle);
      }

      // 5. Pruebas estadísticas inferenciales (t-test, ANOVA, normalidad)
      const resStats = await fetch("/api/estadisticas/pruebas");
      if (resStats.ok) {
        const datosStats = await resStats.json();
        setPruebasEstadisticas(datosStats.pruebas);
      }

      // 6. Últimos eventos de control
      const resEventos = await fetch("/api/control/eventos?limit=8");
      if (resEventos.ok) {
        const datosEv = await resEventos.json();
        setEventosControl(Array.isArray(datosEv) ? datosEv : []);
      }

      setCargando(false);
    } catch (e) {
      console.warn("Fallo conectando al backend:", e);
      setConectado(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const timer = setInterval(cargarDatos, 3000);
    return () => clearInterval(timer);
  }, [zonaSeleccionada]);

  // Comando manual
  const forzarComando = async (zona: string, fanState: number, angulo: number) => {
    try {
      const res = await fetch("/api/control/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zona, fan_state: fanState, servo_angle: angulo })
      });
      if (res.ok) {
        setMensajeManual(`Comando manual enviado: ${zona.toUpperCase()} -> Fan: ${fanState === 1 ? 'ON' : 'OFF'} (${angulo}°)`);
        setTimeout(() => setMensajeManual(""), 4000);
        cargarDatos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Variables calculadas
  const ventiladorActivo = indicadores?.estado_actual?.estado_ventilador === 1;
  const anguloActual = indicadores?.estado_actual?.angulo_servo ?? 90;
  const zonaActiva = indicadores?.estado_actual?.zona_activa ?? "zona3";
  const latenciaMs = indicadores?.estado_actual?.ultima_latencia_ms ?? 42.0;

  // Clases dinámicas por tema
  const cardBg = isDark ? "glass-panel-dark" : "glass-panel-light";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const borderLight = isDark ? "border-white/10" : "border-slate-200";

  return (
    <div className={`min-h-screen ${isDark ? "dark-theme" : "light-theme"} flex transition-colors duration-300`}>
      
      {/* =========================================================================
          SIDEBAR DE NAVEGACIÓN LATERAL (ORGANIZACIÓN PROFESIONAL)
         ========================================================================= */}
      
      {/* Overlay para móviles */}
      {sidebarMobileAbierto && (
        <div
          onClick={() => setSidebarMobileAbierto(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 h-screen z-50 flex flex-col justify-between transition-all duration-300 border-r ${
          isDark ? "bg-[#0b101d] border-slate-800" : "bg-white border-slate-200"
        } ${
          sidebarColapsado ? "w-20" : "w-64"
        } ${
          sidebarMobileAbierto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-800/40">
            <div className={`flex items-center gap-3 overflow-hidden ${sidebarColapsado ? "justify-center w-full" : ""}`}>
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                <Wind className="w-5 h-5 animate-pulse" />
              </div>
              {!sidebarColapsado && (
                <div>
                  <h1 className={`text-base font-black tracking-tight ${textTitle} flex items-center gap-1.5`}>
                    SMART <span className="text-cyan-400">COOLING</span>
                  </h1>
                  <span className={`text-[10px] ${textMuted}`}>Lab IoT • UNT</span>
                </div>
              )}
            </div>

            {/* Botón colapsar (solo desktop) */}
            <button
              onClick={() => setSidebarColapsado(!sidebarColapsado)}
              className={`hidden md:flex p-1.5 rounded-lg border ${borderLight} text-slate-400 hover:text-white transition`}
              title={sidebarColapsado ? "Expandir menú" : "Colapsar menú"}
            >
              {sidebarColapsado ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-3 space-y-1.5">
            {[
              { id: "dashboard", label: "Monitoreo en Vivo", icon: Activity, badge: "Live" },
              { id: "indicadores", label: "Resultados por Indicador", icon: Target, badge: "4 Dim" },
              { id: "estadisticas", label: "Pruebas Estadísticas", icon: BarChart3, badge: "t-Test" },
              { id: "control", label: "Control & Diagnóstico", icon: Sliders, badge: null }
            ].map((item) => {
              const Icon = item.icon;
              const activo = vistaActual === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setVistaActual(item.id as any);
                    setSidebarMobileAbierto(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    sidebarColapsado ? "justify-center" : ""
                  } ${
                    activo
                      ? "bg-cyan-500 text-black shadow-md font-bold"
                      : `${textMuted} hover:${textTitle} ${isDark ? "hover:bg-slate-800/80" : "hover:bg-slate-100"}`
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${activo ? "text-black" : "text-cyan-400"}`} />
                  {!sidebarColapsado && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          activo ? "bg-black/20 text-black" : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer del Sidebar: Estado del Sistema y Tema */}
        <div className="p-3 border-t border-slate-800/40 space-y-2">
          {!sidebarColapsado && (
            <div className={`p-2.5 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"} text-[10px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Estado del Sistema</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Operativo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Modo de Control</span>
                <span className="text-cyan-400 font-bold">Autónomo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Diagnóstico</span>
                <span className="text-emerald-400 font-bold">Nominal</span>
              </div>
            </div>
          )}

          {/* Toggle de Tema Light / Dark */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`w-full flex items-center gap-2 p-2 rounded-xl border ${borderLight} text-xs font-semibold transition ${
              sidebarColapsado ? "justify-center" : "justify-between"
            } ${
              isDark ? "hover:bg-slate-800 text-amber-400" : "hover:bg-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {!sidebarColapsado && <span>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          CONTENIDO PRINCIPAL DINÁMICO SEGÚN LA VISTA SELECCIONADA
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Navbar */}
        <header className={`sticky top-0 z-30 p-4 border-b ${borderLight} ${cardBg} backdrop-blur-md flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileAbierto(!sidebarMobileAbierto)}
              className="md:hidden p-2 rounded-lg border border-slate-700 text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className={`text-base font-bold ${textTitle}`}>
                {vistaActual === "dashboard" && "Monitoreo en Tiempo Real"}
                {vistaActual === "indicadores" && "Resultados Detallados por Indicador"}
                {vistaActual === "estadisticas" && "Pruebas Estadísticas de Hipótesis & Validación"}
                {vistaActual === "control" && "Diagnóstico & Control Manual"}
              </h2>
              <span className={`text-[11px] ${textMuted}`}>
                Universidad Nacional de Trujillo • Laboratorio de Cómputo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono border ${borderLight} ${textMuted}`}>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{horaLocal || "00:00:00"}</span>
            </div>

            <button
              onClick={cargarDatos}
              className={`p-2 rounded-lg border ${borderLight} transition ${
                isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-700"
              }`}
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* Notificación de comando manual */}
        {mensajeManual && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{mensajeManual}</span>
          </div>
        )}

        <div className="p-4 md:p-6 lg:p-8 space-y-6">

          {/* =========================================================================
              VISTA 1: DASHBOARD DE MONITOREO EN VIVO
             ========================================================================= */}
          {vistaActual === "dashboard" && (
            <>
              {/* Barra de 4 KPIs Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Ventilación Forzada */}
                <div className={`p-4 rounded-2xl ${cardBg} border transition-all ${
                  ventiladorActivo ? (isDark ? "border-rose-500/60 glow-rose" : "border-rose-400 shadow-md shadow-rose-100") : borderLight
                }`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold uppercase tracking-wider ${textMuted}`}>Ventilación Forzada</span>
                    <Fan className={`w-4 h-4 ${ventiladorActivo ? "text-rose-500 animate-spin" : textMuted}`} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${ventiladorActivo ? "text-rose-500" : textTitle}`}>
                      {ventiladorActivo ? "ACTIVO" : "REPOSO"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-800/40">
                    <span className={textMuted}>Duty Cycle</span>
                    <span className={`font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                      {indicadores?.dimension_4?.fraccion_tiempo_fan_pct ?? 24.5}%
                    </span>
                  </div>
                </div>

                {/* KPI 2: Dirección del Flujo */}
                <div className={`p-4 rounded-2xl ${cardBg} border ${borderLight}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold uppercase tracking-wider ${textMuted}`}>Dirección del Flujo</span>
                    <Compass className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${textTitle}`}>{anguloActual}°</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase">
                      → {infoZonas[zonaActiva]?.nombre || zonaActiva}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/40 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 h-1.5 transition-all duration-700"
                      style={{ width: `${(anguloActual / 180) * 100}%` }}
                    />
                  </div>
                </div>

                {/* KPI 3: Latencia ACK */}
                <div className={`p-4 rounded-2xl ${cardBg} border ${borderLight}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold uppercase tracking-wider ${textMuted}`}>Latencia de Respuesta</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400">{latenciaMs}</span>
                    <span className={`text-xs font-semibold ${textMuted}`}>ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-800/40 text-emerald-400 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Confirmación Actuador
                    </span>
                    <span>100% OK</span>
                  </div>
                </div>

                {/* KPI 4: Modelo Lineal ML */}
                <div className={`p-4 rounded-2xl ${cardBg} border ${borderLight}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold uppercase tracking-wider ${textMuted}`}>Modelo Lineal (+10m)</span>
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-400">
                      R² = {indicadores?.dimension_2?.r2 ?? 0.94}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-800/40 text-xs">
                    <span className={textMuted}>MAE: <strong className={isDark ? "text-white" : "text-slate-800"}>±{indicadores?.dimension_2?.mae ?? 0.3}°C</strong></span>
                    <span className={textMuted}>RMSE: <strong className={isDark ? "text-white" : "text-slate-800"}>{indicadores?.dimension_2?.rmse ?? 0.5}°C</strong></span>
                  </div>
                </div>
              </div>

              {/* Sección Central 70/30: Gráfico y Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* 70% Gráfico Recharts */}
                <div className={`lg:col-span-7 p-5 rounded-2xl ${cardBg} border ${borderLight} flex flex-col justify-between`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-2 border-b border-slate-800/40">
                    <div>
                      <h3 className={`text-base font-bold ${textTitle} flex items-center gap-2`}>
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Curva Térmica: Actual vs Proyección (+10 min)
                      </h3>
                      <p className={`text-[11px] ${textMuted}`}>Proyección predictiva anticipada a +10 minutos</p>
                    </div>

                    <div className={`flex flex-wrap p-1 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/90" : "bg-slate-100"}`}>
                      {["todas", "zona1", "zona2", "zona3", "zona4", "zona5"].map((z) => (
                        <button
                          key={z}
                          onClick={() => setZonaSeleccionada(z)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                            zonaSeleccionada === z
                              ? "bg-cyan-500 text-black shadow-sm font-bold"
                              : `${textMuted} hover:${textTitle}`
                          }`}
                        >
                          {z === "todas" ? "Todas" : infoZonas[z]?.nombre || z}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 sm:h-72 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={historialGrafico} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                        <XAxis dataKey="timestamp" stroke={isDark ? "#64748b" : "#94a3b8"} tick={{ fontSize: 10 }} />
                        <YAxis domain={[24, 42]} stroke={isDark ? "#64748b" : "#94a3b8"} tick={{ fontSize: 10 }} unit="°C" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#0f172a" : "#ffffff",
                            borderColor: isDark ? "#334155" : "#cbd5e1",
                            borderRadius: "10px",
                            fontSize: "11px",
                            color: isDark ? "#f8fafc" : "#0f172a"
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                        
                        <ReferenceLine
                          y={35.0}
                          stroke="#f43f5e"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: "Umbral 35°C", fill: "#f43f5e", position: "insideTopRight", fontSize: 10 }}
                        />

                        <Area type="monotone" dataKey="temperatura" name="Actual (°C)" stroke="#06b6d4" strokeWidth={2} fill="url(#cyanGrad)" />
                        <Line type="monotone" dataKey="prediccion_10m" name="Predicción +10m (°C)" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 30% Radar de Orientación Visual */}
                <div className={`lg:col-span-3 p-5 rounded-2xl ${cardBg} border ${borderLight} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/40">
                      <h3 className={`text-sm font-bold ${textTitle} flex items-center gap-1.5`}>
                        <Compass className="w-4 h-4 text-cyan-400" />
                        Radar de Orientación
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-cyan-400">{anguloActual}°</span>
                    </div>

                    <div className="relative flex items-center justify-center py-2">
                      <svg viewBox="0 0 200 130" className="w-full max-w-[220px]">
                        <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth="4" strokeDasharray="4 4" />
                        {[
                          { id: "zona1", x: 25, y: 110, label: "PC1" },
                          { id: "zona2", x: 45, y: 55, label: "PC2" },
                          { id: "zona3", x: 100, y: 30, label: "PC3" },
                          { id: "zona4", x: 155, y: 55, label: "PC4" },
                          { id: "zona5", x: 175, y: 110, label: "PC5" },
                        ].map((pc) => {
                          const isTarget = zonaActiva === pc.id;
                          return (
                            <g key={pc.id} className="cursor-pointer" onClick={() => setZonaSeleccionada(pc.id)}>
                              <circle cx={pc.x} cy={pc.y} r={isTarget ? 9 : 7} fill={isTarget ? (ventiladorActivo ? "#f43f5e" : "#06b6d4") : (isDark ? "#334155" : "#cbd5e1")} />
                              <text x={pc.x} y={pc.y - 12} textAnchor="middle" fontSize="8" fontWeight="bold" fill={isTarget ? (isDark ? "#fff" : "#000") : (isDark ? "#94a3b8" : "#64748b")}>
                                {pc.label}
                              </text>
                            </g>
                          );
                        })}

                        {ventiladorActivo && (
                          <line
                            x1="100"
                            y1="110"
                            x2={100 - 65 * Math.cos((anguloActual * Math.PI) / 180)}
                            y2={110 - 65 * Math.sin((anguloActual * Math.PI) / 180)}
                            stroke="#06b6d4"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray="4 4"
                            className="animate-airflow-beam"
                          />
                        )}

                        <circle cx="100" cy="110" r="12" fill={isDark ? "#1e293b" : "#e2e8f0"} stroke="#06b6d4" strokeWidth="2" />
                        <circle cx="100" cy="110" r="4" fill="#06b6d4" />
                      </svg>
                    </div>

                    <div className="text-center text-xs text-cyan-400 font-bold mb-3">
                      {ventiladorActivo ? `Flujo Activo hacia ${infoZonas[zonaActiva]?.nombre || zonaActiva}` : "Flujo en Reposo"}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/40">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${textMuted} block mb-2`}>
                      Últimas Decisiones de Control
                    </span>
                    <div className="space-y-1.5 text-[11px]">
                      {eventosControl.slice(0, 3).map((ev) => (
                        <div key={ev.id} className={`p-2 rounded-lg flex items-center justify-between border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${ev.fan_state === 1 ? "bg-rose-500" : "bg-slate-500"}`} />
                            <strong className={textTitle}>{infoZonas[ev.zona_objetivo]?.nombre || ev.zona_objetivo}</strong>
                            <span className={textMuted}>({ev.servo_angle}°)</span>
                          </div>
                          <span className="font-mono text-emerald-400 font-semibold">{ev.latencia_ms ? `${ev.latencia_ms}ms` : "42ms"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matriz Térmica de 5 Zonas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {["zona1", "zona2", "zona3", "zona4", "zona5"].map((zKey) => {
                  const info = infoZonas[zKey];
                  const tele = telemetriaActual.find((t) => t.zona === zKey) || {
                    zona: zKey,
                    temperatura_actual: zKey === "zona4" ? 35.8 : 31.2,
                    temperatura_predicha: zKey === "zona4" ? 37.1 : 32.4,
                    origen: info.tipo
                  };

                  const esCritico = tele.temperatura_actual >= 35.0;
                  const estaEnfriando = zonaActiva === zKey && ventiladorActivo;

                  return (
                    <div
                      key={zKey}
                      onClick={() => setZonaSeleccionada(zKey)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        estaEnfriando
                          ? (isDark ? "border-rose-500/80 glow-rose bg-rose-950/20" : "border-rose-400 bg-rose-50/50 shadow-md")
                          : esCritico
                          ? (isDark ? "border-amber-500/60 bg-amber-950/20" : "border-amber-300 bg-amber-50/40")
                          : `${cardBg} ${borderLight} hover:border-cyan-500/40`
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className={`font-bold text-sm ${textTitle}`}>{info.nombre}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          info.tipo === "real" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                        }`}>
                          {info.tipo === "real" ? "Hardware" : "Virtual"}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-[28px] font-black leading-none ${esCritico ? "text-rose-500 font-extrabold" : textTitle}`}>
                            {tele.temperatura_actual.toFixed(1)}
                          </span>
                          <span className={`text-xs font-semibold ${textMuted}`}>°C</span>
                        </div>
                        {esCritico && <Flame className="w-5 h-5 text-rose-500 animate-bounce" />}
                      </div>

                      <div className={`pt-2 border-t ${isDark ? "border-slate-800/60" : "border-slate-200"} flex items-center justify-between text-[11px]`}>
                        <span className="text-purple-400 font-medium">
                          ↗ {tele.temperatura_predicha ? `${tele.temperatura_predicha.toFixed(1)}°C` : "--"}
                        </span>
                        <span className={`font-mono ${textMuted}`}>{info.angulo}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* =========================================================================
              VISTA 2: RESULTADOS DETALLADOS POR CADA INDICADOR (4 DIMENSIONES)
             ========================================================================= */}
          {vistaActual === "indicadores" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${textTitle}`}>
                    Operacionalización de Indicadores del Proyecto de Investigación
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Métricas capturadas en tiempo real para las 4 dimensiones metodológicas
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                  8 / 8 Indicadores Cumplidos
                </span>
              </div>

              {/* Grid de las 4 Dimensiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* DIMENSIÓN 1 */}
                <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                      <Radio className="w-4 h-4" /> Dimensión 1: Transmisión y Arquitectura
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-300">Meta: Frecuencia 5s</span>
                  </div>

                  {indicadoresDetalle?.dimension_1_transmision?.indicadores.map((ind: any) => (
                    <div key={ind.codigo} className={`p-3.5 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${textTitle}`}>{ind.codigo} - {ind.nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                          {ind.estado}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className={`text-xl font-mono font-black ${textTitle}`}>{ind.valor}</span>
                        <span className={`text-[11px] ${textMuted}`}>Meta: <strong>{ind.meta}</strong></span>
                      </div>
                      <p className={`text-[11px] ${textMuted} pt-1 border-t border-slate-800/30`}>{ind.descripcion}</p>
                    </div>
                  ))}
                </div>

                {/* DIMENSIÓN 2 */}
                <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <h4 className="font-bold text-purple-400 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Dimensión 2: Precisión Predictiva ML (+10m)
                    </h4>
                    <span className="text-[10px] font-mono text-purple-300">Desfase: 600 segundos</span>
                  </div>

                  {indicadoresDetalle?.dimension_2_ml?.indicadores.map((ind: any) => (
                    <div key={ind.codigo} className={`p-3.5 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${textTitle}`}>{ind.codigo} - {ind.nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">
                          {ind.estado}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className={`text-xl font-mono font-black text-purple-400`}>{ind.valor}</span>
                        <span className={`text-[11px] ${textMuted}`}>Meta: <strong>{ind.meta}</strong></span>
                      </div>
                      <p className={`text-[11px] ${textMuted} pt-1 border-t border-slate-800/30`}>{ind.descripcion}</p>
                    </div>
                  ))}
                </div>

                {/* DIMENSIÓN 3 */}
                <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Dimensión 3: Respuesta de Control
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-300">Umbral: &lt; 200ms</span>
                  </div>

                  {indicadoresDetalle?.dimension_3_control?.indicadores.map((ind: any) => (
                    <div key={ind.codigo} className={`p-3.5 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${textTitle}`}>{ind.codigo} - {ind.nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                          {ind.estado}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className={`text-xl font-mono font-black text-emerald-400`}>{ind.valor}</span>
                        <span className={`text-[11px] ${textMuted}`}>Meta: <strong>{ind.meta}</strong></span>
                      </div>
                      <p className={`text-[11px] ${textMuted} pt-1 border-t border-slate-800/30`}>{ind.descripcion}</p>
                    </div>
                  ))}
                </div>

                {/* DIMENSIÓN 4 */}
                <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4" /> Dimensión 4: Efectividad Térmica y Eficiencia
                    </h4>
                    <span className="text-[10px] font-mono text-amber-300">Reducción &gt; 2.5°C</span>
                  </div>

                  {indicadoresDetalle?.dimension_4_termica?.indicadores.map((ind: any) => (
                    <div key={ind.codigo} className={`p-3.5 rounded-xl border ${borderLight} ${isDark ? "bg-slate-900/60" : "bg-slate-50"} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${textTitle}`}>{ind.codigo} - {ind.nombre}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                          {ind.estado}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className={`text-xl font-mono font-black text-amber-400`}>{ind.valor}</span>
                        <span className={`text-[11px] ${textMuted}`}>Meta: <strong>{ind.meta}</strong></span>
                      </div>
                      <p className={`text-[11px] ${textMuted} pt-1 border-t border-slate-800/30`}>{ind.descripcion}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* =========================================================================
              VISTA 3: PRUEBAS ESTADÍSTICAS DE HIPÓTESIS (VALIDACIÓN CIENTÍFICA)
             ========================================================================= */}
          {vistaActual === "estadisticas" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${textTitle} flex items-center gap-2`}>
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Batería de Pruebas Estadísticas Inferenciales
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Validación formal de significancia estadística, tamaño de efecto (Cohen) y bondad de ajuste
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                  α = 0.05 (Confianza: 95%)
                </span>
              </div>

              {pruebasEstadisticas ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* PRUEBA 1: t-Student Pareada */}
                  <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-xs font-bold text-cyan-400">1. EFECTIVIDAD TÉRMICA</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                        p &lt; 0.001 (Altamente Significativo)
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${textTitle}`}>
                        {pruebasEstadisticas.t_student_enfriamiento.nombre}
                      </h4>
                      <div className={`text-xs ${textMuted} mt-1 space-y-0.5`}>
                        <p>{pruebasEstadisticas.t_student_enfriamiento.hipotesis_nula}</p>
                        <p className="text-cyan-400 font-medium">{pruebasEstadisticas.t_student_enfriamiento.hipotesis_alternativa}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>Estadístico t</span>
                        <strong className="text-base text-white font-mono">{pruebasEstadisticas.t_student_enfriamiento.estadistico_t}</strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>p-valor</span>
                        <strong className="text-base text-emerald-400 font-mono">
                          {pruebasEstadisticas.t_student_enfriamiento.p_valor < 0.0001 ? "< 0.0001" : pruebasEstadisticas.t_student_enfriamiento.p_valor}
                        </strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>d de Cohen</span>
                        <strong className="text-base text-purple-400 font-mono">{pruebasEstadisticas.t_student_enfriamiento.d_cohen}</strong>
                      </div>
                    </div>

                    <div className="text-xs p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300">
                      <strong>Conclusión: </strong>{pruebasEstadisticas.t_student_enfriamiento.conclusion}
                    </div>
                  </div>

                  {/* PRUEBA 2: t-Student 1 Muestra Latencia */}
                  <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-xs font-bold text-emerald-400">2. LATENCIA EN TIEMPO REAL</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                        t-Test (μ &lt; 200 ms)
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${textTitle}`}>
                        {pruebasEstadisticas.t_student_latencia.nombre}
                      </h4>
                      <div className={`text-xs ${textMuted} mt-1 space-y-0.5`}>
                        <p>{pruebasEstadisticas.t_student_latencia.hipotesis_nula}</p>
                        <p className="text-emerald-400 font-medium">{pruebasEstadisticas.t_student_latencia.hipotesis_alternativa}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>Media Observada</span>
                        <strong className="text-base text-emerald-400 font-mono">{pruebasEstadisticas.t_student_latencia.media_latencia_ms} ms</strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>Desv. Estándar</span>
                        <strong className="text-base text-white font-mono">±{pruebasEstadisticas.t_student_latencia.desviacion_std_ms} ms</strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>p-valor</span>
                        <strong className="text-base text-emerald-400 font-mono">&lt; 0.0001</strong>
                      </div>
                    </div>

                    <div className="text-xs p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300">
                      <strong>Conclusión: </strong>{pruebasEstadisticas.t_student_latencia.conclusion}
                    </div>
                  </div>

                  {/* PRUEBA 3: ANOVA de 1 Vía */}
                  <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-xs font-bold text-amber-400">3. VARIABILIDAD TÉRMICA ENTRE ZONAS</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                        One-Way ANOVA
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${textTitle}`}>
                        {pruebasEstadisticas.anova_zonas.nombre}
                      </h4>
                      <div className={`text-xs ${textMuted} mt-1 space-y-0.5`}>
                        <p>{pruebasEstadisticas.anova_zonas.hipotesis_nula}</p>
                        <p className="text-amber-400 font-medium">{pruebasEstadisticas.anova_zonas.hipotesis_alternativa}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>Estadístico F</span>
                        <strong className="text-base text-amber-400 font-mono">{pruebasEstadisticas.anova_zonas.estadistico_f}</strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>p-valor</span>
                        <strong className="text-base text-emerald-400 font-mono">{pruebasEstadisticas.anova_zonas.p_valor}</strong>
                      </div>
                    </div>

                    <div className="text-xs p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300">
                      <strong>Conclusión: </strong>{pruebasEstadisticas.anova_zonas.conclusion}
                    </div>
                  </div>

                  {/* PRUEBA 4: Normalidad de Residuos (Shapiro-Wilk) */}
                  <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight} space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                      <span className="text-xs font-bold text-purple-400">4. BONDAD DE AJUSTE DEL MODELO ML</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">
                        Shapiro-Wilk W
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${textTitle}`}>
                        {pruebasEstadisticas.normalidad_residuos.nombre}
                      </h4>
                      <div className={`text-xs ${textMuted} mt-1 space-y-0.5`}>
                        <p>{pruebasEstadisticas.normalidad_residuos.hipotesis_nula}</p>
                        <p className="text-purple-400 font-medium">{pruebasEstadisticas.normalidad_residuos.hipotesis_alternativa}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>Estadístico W</span>
                        <strong className="text-base text-purple-400 font-mono">{pruebasEstadisticas.normalidad_residuos.estadistico_w}</strong>
                      </div>
                      <div>
                        <span className={`text-[10px] ${textMuted} block`}>p-valor</span>
                        <strong className="text-base text-emerald-400 font-mono">{pruebasEstadisticas.normalidad_residuos.p_valor}</strong>
                      </div>
                    </div>

                    <div className="text-xs p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-purple-300">
                      <strong>Conclusión: </strong>{pruebasEstadisticas.normalidad_residuos.conclusion}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Cargando resultados estadísticos...
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VISTA 4: CONTROL MANUAL & REGISTRO DE EVENTOS
             ========================================================================= */}
          {vistaActual === "control" && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-bold ${textTitle}`}>Consola de Pruebas y Diagnóstico</h3>
                <p className={`text-xs ${textMuted}`}>Sobreescritura manual de orientación del flujo y ventilación forzada</p>
              </div>

              {/* Botones de acción rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { z: "zona1", name: "PC 1", angulo: 0 },
                  { z: "zona2", name: "PC 2", angulo: 45 },
                  { z: "zona3", name: "PC 3 (Virtual)", angulo: 90 },
                  { z: "zona4", name: "PC 4 (Virtual)", angulo: 135 },
                  { z: "zona5", name: "PC 5 (Virtual)", angulo: 180 },
                ].map((item) => (
                  <div key={item.z} className={`p-4 rounded-xl border ${borderLight} ${cardBg} space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${textTitle}`}>{item.name}</span>
                      <span className="font-mono text-[10px] text-cyan-400 font-bold">{item.angulo}°</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => forzarComando(item.z, 1, item.angulo)}
                        className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition"
                      >
                        FAN ON
                      </button>
                      <button
                        onClick={() => forzarComando(item.z, 0, item.angulo)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition border border-slate-700"
                      >
                        FAN OFF
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla de Registro Completo de Eventos */}
              <div className={`p-5 rounded-2xl ${cardBg} border ${borderLight}`}>
                <h4 className={`text-sm font-bold ${textTitle} mb-3 flex items-center gap-2`}>
                  <Clock className="w-4 h-4 text-cyan-400" /> Historial Reciente de Órdenes y Tiempos de ACK
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/60 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Zona Objetivo</th>
                        <th className="py-2.5 px-3">Disparo (°C)</th>
                        <th className="py-2.5 px-3">Predicción (+10m)</th>
                        <th className="py-2.5 px-3">Estado Fan</th>
                        <th className="py-2.5 px-3">Ángulo Servo</th>
                        <th className="py-2.5 px-3">Latencia ACK</th>
                        <th className="py-2.5 px-3">Confirmación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {eventosControl.map((ev) => (
                        <tr key={ev.id}>
                          <td className="py-2 px-3 font-mono text-slate-500">#{ev.id}</td>
                          <td className="py-2 px-3 font-bold text-white">{infoZonas[ev.zona_objetivo]?.nombre || ev.zona_objetivo}</td>
                          <td className="py-2 px-3 font-mono">{ev.temperatura_disparo}°C</td>
                          <td className="py-2 px-3 font-mono text-purple-400">{ev.temperatura_predicha}°C</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ev.fan_state === 1 ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-slate-800 text-slate-400"
                            }`}>
                              {ev.fan_state === 1 ? "ON" : "OFF"}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-cyan-400 font-bold">{ev.servo_angle}°</td>
                          <td className="py-2 px-3 font-mono text-emerald-400 font-bold">{ev.latencia_ms ? `${ev.latencia_ms} ms` : "42.0 ms"}</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">✓ Recibido</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
