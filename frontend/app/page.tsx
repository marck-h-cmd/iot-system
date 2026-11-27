"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  RefreshCw,
  Scale,
  Sliders,
  Sun,
  X,
} from "lucide-react";
import {
  AlertaActiva,
  EscenarioSimulacion,
  EstadoActualResponse,
  EvaluacionModelo,
  EvidenciaHistorica,
  EventoControl,
  IndicadoresDetalladosResponse,
  IndicadoresResponse,
  ModoControl,
  PruebasEstadisticasResponse,
} from "../types/iot";
import {
  cambiarEscenarioSimulacionApi,
  cambiarModoControlApi,
  cambiarModoOperacionSistemaApi,
  enviarComandoManualApi,
  fetchDashboardBundle,
  fetchEstadisticas,
  fetchIndicadores,
  reiniciarSimulacionApi,
} from "../services/api";
import { BrandLogo } from "../components/BrandLogo";
import { ProjectInfoModal } from "../components/ProjectInfoModal";
import { ZoneDetailModal } from "../components/ZoneDetailModal";
import { LiveMonitoringView } from "../components/Views/LiveMonitoringView";
import { IndicatorsView } from "../components/Views/IndicatorsView";
import { StatisticsView } from "../components/Views/StatisticsView";
import { ControlDiagnosticsView } from "../components/Views/ControlDiagnosticsView";

type TabView = "monitoreo" | "indicadores" | "estadisticas" | "control";

const SECTION_TITLES: Record<TabView, { title: string; subtitle: string }> = {
  monitoreo: {
    title: "Monitoreo en Tiempo Real",
    subtitle: "Supervisión térmica continua de estaciones de cómputo",
  },
  indicadores: {
    title: "Indicadores de Investigación",
    subtitle: "Métricas operacionales y validación de modelo predictivo",
  },
  estadisticas: {
    title: "Pruebas Estadísticas de Hipótesis & Validación",
    subtitle: "Universidad Nacional de Trujillo · Laboratorio de Cómputo",
  },
  control: {
    title: "Diagnóstico y Control de Actuación",
    subtitle: "Orientación servo y control de flujo de disipación",
  },
};

export default function SmartCoolingDashboard() {
  const [activeTab, setActiveTab] = useState<TabView>("monitoreo");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [projectInfoOpen, setProjectInfoOpen] = useState<boolean>(false);

  const [estadoActual, setEstadoActual] = useState<EstadoActualResponse | null>(
    null
  );
  const [historial, setHistorial] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresResponse | null>(
    null
  );
  const [indicadoresDetallados, setIndicadoresDetallados] =
    useState<IndicadoresDetalladosResponse | null>(null);
  const [pruebasEstadisticas, setPruebasEstadisticas] =
    useState<PruebasEstadisticasResponse | null>(null);
  const [evaluacionesModelo, setEvaluacionesModelo] = useState<EvaluacionModelo[]>([]);
  const [evidencia, setEvidencia] = useState<EvidenciaHistorica | null>(null);
  const [errorInvestigacion, setErrorInvestigacion] = useState(false);
  const [eventos, setEventos] = useState<EventoControl[]>([]);
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);
  const [zonaSeleccionadaChart, setZonaSeleccionadaChart] =
    useState<string>("zona1");
  const [zonaModalId, setZonaModalId] = useState<string | null>(null);
  const [errorConexion, setErrorConexion] = useState<boolean>(false);
  const [ultimaActualizacionUI, setUltimaActualizacionUI] =
    useState<string>("");

  // Estado del panel de control manual
  const [controlZona, setControlZona] = useState<string>("zona3");
  const [controlAngulo, setControlAngulo] = useState<number>(90);
  const [controlFan, setControlFan] = useState<boolean>(true);
  const [enviandoControl, setEnviandoControl] = useState<boolean>(false);
  const [feedbackControl, setFeedbackControl] = useState<string | null>(null);

  const cargarDatos = async (signal?: AbortSignal) => {
    try {
      const bundle = await fetchDashboardBundle(signal);
      setEstadoActual(bundle.estadoActual);
      setHistorial(bundle.historial);
      setEventos(bundle.eventos);
      setAlertas(bundle.alertas);
      setErrorConexion(false);
      setUltimaActualizacionUI(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      if (!signal?.aborted) setErrorConexion(true);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function actualizar() {
      await cargarDatos(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(actualizar, 3000);
    }
    void actualizar();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "indicadores" && activeTab !== "estadisticas") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setErrorInvestigacion(false);
    async function actualizar() {
      try {
        if (activeTab === "indicadores") {
          const datos = await fetchIndicadores(controller.signal);
          setIndicadores(datos.indicadores);
          setIndicadoresDetallados(datos.detalle);
          setEvaluacionesModelo(datos.modelos);
        } else {
          const datos = await fetchEstadisticas(controller.signal);
          setPruebasEstadisticas(datos.pruebas);
          setEvidencia(datos.evidencia);
        }
        setErrorInvestigacion(false);
      } catch {
        if (!controller.signal.aborted) setErrorInvestigacion(true);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(actualizar, 15000);
      }
    }
    void actualizar();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!estadoActual) return;
    const zonas = Object.entries(estadoActual.zonas);
    const seleccionada = estadoActual.zonas[zonaSeleccionadaChart];
    if (seleccionada?.origen === "sin_sensor") {
      const primera = zonas.find(([, zona]) => zona.origen === "real");
      if (primera) setZonaSeleccionadaChart(primera[0]);
    }
    const esSimulada = estadoActual.zonas[controlZona]?.origen === "virtual";
    if (!esSimulada) {
      const primera = zonas.find(([, zona]) => zona.origen === "virtual");
      if (primera) {
        setControlZona(primera[0]);
        setControlAngulo(primera[1].angulo_servo);
      }
    }
  }, [estadoActual, controlZona, zonaSeleccionadaChart]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (darkMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
        document.body.style.backgroundColor = "#0B1220";
        document.body.style.color = "#F8FAFC";
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        document.body.classList.add("light-theme");
        document.body.classList.remove("dark-theme");
        document.body.style.backgroundColor = "#F8FAFC";
        document.body.style.color = "#0F172A";
      }
    }
  }, [darkMode]);

  const handleCambiarModoControl = async (modo: ModoControl) => {
    try {
      await cambiarModoControlApi(modo);
      setFeedbackControl(
        modo === "manual"
          ? "Modo manual activado."
          : "Modo automático activado."
      );
      await cargarDatos();
      setTimeout(() => setFeedbackControl(null), 3500);
    } catch {
      setFeedbackControl("Error al cambiar el modo de control.");
    }
  };

  const handleEnviarControlManual = async (
    zonaOverride?: string,
    anguloOverride?: number,
    fanOverride?: boolean
  ) => {
    const zTarget = zonaOverride ?? controlZona;
    if (estadoActual?.zonas[zTarget]?.origen !== "virtual") return;
    const angTarget = anguloOverride ?? controlAngulo;
    const fanTarget = fanOverride ?? controlFan;

    setEnviandoControl(true);
    setFeedbackControl(null);
    try {
      const data = await enviarComandoManualApi({
        zona: zTarget,
        ventilador_activo: fanTarget,
        angulo_servo: angTarget,
      });
      setFeedbackControl(
        `Comando enviado (${data.comando_id || "MQTT"}): ${zTarget.toUpperCase()} • ${angTarget}° • Fan ${
          fanTarget ? "ON" : "OFF"
        }`
      );
      await cargarDatos();
      setTimeout(() => setFeedbackControl(null), 4000);
    } catch {
      setFeedbackControl("Error al enviar comando manual.");
    } finally {
      setEnviandoControl(false);
    }
  };

  const handleCambiarEscenario = async (escenario: EscenarioSimulacion) => {
    try {
      await cambiarEscenarioSimulacionApi(escenario);
      setFeedbackControl(`Escenario actualizado: ${escenario}`);
      await cargarDatos();
      setTimeout(() => setFeedbackControl(null), 3500);
    } catch {
      setFeedbackControl("Error al cambiar escenario.");
    }
  };

  const handleReiniciarSimulacion = async () => {
    try {
      await reiniciarSimulacionApi();
      setFeedbackControl("Simulación reiniciada.");
      await cargarDatos();
      setTimeout(() => setFeedbackControl(null), 3500);
    } catch {
      setFeedbackControl("Error al reiniciar simulación.");
    }
  };

  const handleCambiarModoOperacionSistema = async (
    modo: "simulacion" | "real" | "hibrido"
  ) => {
    try {
      await cambiarModoOperacionSistemaApi(modo);
      setFeedbackControl(`Modo del sistema actualizado a: ${modo.toUpperCase()}`);
      await cargarDatos();
      setTimeout(() => setFeedbackControl(null), 3500);
    } catch {
      setFeedbackControl("Error al cambiar el modo de operación.");
    }
  };

  const chartHistory = useMemo(() => {
    const origen = estadoActual?.zonas[zonaSeleccionadaChart]?.origen;
    return historial
      .filter((item) => item.zona === zonaSeleccionadaChart && item.origen === origen)
      .slice(-26)
      .map((item) => ({
        hora: item.fecha_registro
          ? new Date(item.fecha_registro).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "",
        temperatura: Number(item.temperatura),
        prediccion: item.prediccion_10m,
        umbral: 35.0,
      }));
  }, [historial, zonaSeleccionadaChart, estadoActual]);

  const cardClass = darkMode ? "surface-card-dark" : "surface-card-light";
  const subCardClass = darkMode
    ? "surface-elevated-dark"
    : "surface-elevated-light";

  const navItems: { id: TabView; label: string; icon: any }[] = [
    { id: "monitoreo", label: "Monitoreo", icon: LayoutDashboard },
    { id: "indicadores", label: "Indicadores", icon: ClipboardCheck },
    { id: "estadisticas", label: "Estadísticas", icon: Scale },
    { id: "control", label: "Control", icon: Sliders },
  ];

  const modoControlActual: ModoControl =
    estadoActual?.modo_control || "autonomo";
  const online = !errorConexion && estadoActual !== null;

  return (
    <div
      className={`${
        darkMode ? "dark-theme bg-[#0B1220] text-slate-100" : "light-theme bg-[#F8FAFC] text-slate-900"
      } min-h-screen flex transition-colors duration-200`}
    >
      {/* Barra lateral izquierda (Desktop) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 transition-all duration-200 border-r ${
          darkMode
            ? "bg-[#111C2E] border-slate-700/80"
            : "bg-white border-slate-200"
        } ${sidebarExpanded ? "w-56" : "w-16"}`}
      >
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-6">
            <BrandLogo compact={!sidebarExpanded} darkMode={darkMode} />
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={`p-1.5 rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-slate-800 text-slate-400"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
              title={sidebarExpanded ? "Contraer navegación" : "Expandir navegación"}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? darkMode
                        ? "bg-sky-500/15 text-sky-300 font-semibold"
                        : "bg-blue-50 text-blue-700 font-semibold"
                      : darkMode
                      ? "text-slate-300 hover:bg-slate-800/60"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarExpanded && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pie discreto de barra lateral: Botón Acerca del proyecto */}
        <div className="p-3.5 border-t border-slate-500/15">
          <button
            onClick={() => setProjectInfoOpen(true)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              darkMode
                ? "text-slate-300 hover:bg-slate-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Información del proyecto"
          >
            <Info className="w-4 h-4 shrink-0" />
            {sidebarExpanded && <span>Acerca del proyecto</span>}
          </button>
        </div>
      </aside>

      {/* Contenedor principal */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-colors duration-200 ${
          darkMode ? "bg-[#0B1220]" : "bg-[#F8FAFC]"
        }`}
      >
        {/* Cabecera limpia con un único título de sección */}
        <header
          className={`sticky top-0 z-30 border-b px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 ${
            darkMode
              ? "bg-[#0B1220]/95 border-slate-800"
              : "bg-white/95 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg border ${
                darkMode
                  ? "border-slate-700 text-slate-200"
                  : "border-slate-200 text-slate-700"
              }`}
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
            <div>
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                {SECTION_TITLES[activeTab].title}
              </h1>
              <p className={`text-[11px] sm:text-xs ${darkMode ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                {SECTION_TITLES[activeTab].subtitle}
              </p>
            </div>
          </div>

          {/* Controles de estado en fila superior */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Estado de conexión */}
            <div
              className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                online
                  ? darkMode
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-green-50 border-green-200 text-green-800"
                  : darkMode
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  online ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span>{online ? "En línea" : "Sin conexión"}</span>
              {ultimaActualizacionUI && (
                <span className="font-mono opacity-75 hidden sm:inline">
                  {ultimaActualizacionUI}
                </span>
              )}
            </div>

            {/* Selector de modo operacional: Simulación / Híbrido / Real (ESP32) */}
            <div
              className={`inline-flex items-center p-0.5 rounded-lg border text-xs font-medium ${
                darkMode
                  ? "bg-[#111C2E] border-slate-700"
                  : "bg-slate-100 border-slate-200"
              }`}
              title="Seleccionar origen de telemetría: Simulación, Híbrido o Hardware Real (ESP32)"
            >
              {(
                [
                  { id: "simulacion", label: "Simulación" },
                  { id: "hibrido", label: "Híbrido" },
                  { id: "real", label: "Hardware Real" },
                ] as const
              ).map((m) => {
                const modoSys =
                  estadoActual?.modo_operacion === "hardware_real"
                    ? "real"
                    : estadoActual?.modo_operacion || "simulacion";
                const active = modoSys === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleCambiarModoOperacionSistema(m.id)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      active
                        ? m.id === "real"
                          ? darkMode
                            ? "bg-emerald-500 text-slate-950 font-semibold"
                            : "bg-emerald-600 text-white font-semibold"
                          : m.id === "hibrido"
                          ? darkMode
                            ? "bg-amber-500 text-slate-950 font-semibold"
                            : "bg-amber-600 text-white font-semibold"
                          : darkMode
                          ? "bg-sky-500 text-slate-950 font-semibold"
                          : "bg-white text-slate-900 shadow-xs font-semibold"
                        : darkMode
                        ? "text-slate-300 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Selector rápido Manual / Automático */}
            {!["real", "hardware_real"].includes(estadoActual?.modo_operacion ?? "") && (
            <button
              onClick={() =>
                handleCambiarModoControl(
                  modoControlActual === "autonomo" ? "manual" : "autonomo"
                )
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                darkMode
                  ? "bg-[#111C2E] border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
              }`}
              title="Alternar modo del simulador"
            >
              Simulador: {modoControlActual === "manual" ? "Manual" : "Automático"}
            </button>
            )}

            <button
              onClick={() => void cargarDatos()}
              className={`p-1.5 rounded-lg border transition-colors ${
                darkMode
                  ? "bg-[#111C2E] border-slate-700 hover:bg-slate-800 text-slate-300"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
              }`}
              title="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                darkMode
                  ? "bg-[#111C2E] border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
              }`}
              title="Cambiar tema claro u oscuro"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {darkMode ? "Claro" : "Oscuro"}
              </span>
            </button>
          </div>
        </header>

        {/* Menú desplegable en pantallas pequeñas */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden border-b px-4 py-3 space-y-1 ${
              darkMode
                ? "bg-[#111C2E] border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive
                      ? darkMode
                        ? "bg-sky-500/15 text-sky-300 font-semibold"
                        : "bg-blue-50 text-blue-700 font-semibold"
                      : darkMode
                      ? "text-slate-300"
                      : "text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setProjectInfoOpen(true);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                darkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Acerca del proyecto</span>
            </button>
          </div>
        )}

        {/* Área de contenido principal */}
        <main
          className={`flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto transition-colors duration-200 ${
            darkMode ? "bg-[#0B1220]" : "bg-[#F8FAFC]"
          }`}
        >
          {activeTab === "monitoreo" && (
            <LiveMonitoringView
              estadoActual={estadoActual}
              eventos={eventos}
              alertas={alertas}
              chartHistory={chartHistory}
              zonaSeleccionadaChart={zonaSeleccionadaChart}
              setZonaSeleccionadaChart={setZonaSeleccionadaChart}
              darkMode={darkMode}
              cardClass={cardClass}
              subCardClass={subCardClass}
              onSelectZonaModal={(zId) => setZonaModalId(zId)}
            />
          )}

          {activeTab === "indicadores" && (
            <IndicatorsView
              modelos={evaluacionesModelo}
              indicadores={indicadores}
              indicadoresDetallados={indicadoresDetallados}
              darkMode={darkMode}
              cardClass={cardClass}
              subCardClass={subCardClass}
            />
          )}

          {activeTab === "estadisticas" && (
            <StatisticsView
              evidencia={evidencia}
              pruebasEstadisticas={pruebasEstadisticas}
              darkMode={darkMode}
              cardClass={cardClass}
              subCardClass={subCardClass}
            />
          )}

          {errorInvestigacion && (activeTab === "indicadores" || activeTab === "estadisticas") && (
            <p role="alert" className="mt-4 text-sm text-amber-500">No se pudieron actualizar los resultados de investigación.</p>
          )}

          {activeTab === "control" && (
            <ControlDiagnosticsView
              estadoActual={estadoActual}
              eventos={eventos}
              darkMode={darkMode}
              cardClass={cardClass}
              subCardClass={subCardClass}
              controlZona={controlZona}
              setControlZona={setControlZona}
              controlAngulo={controlAngulo}
              setControlAngulo={setControlAngulo}
              controlFan={controlFan}
              setControlFan={setControlFan}
              enviandoControl={enviandoControl}
              feedbackControl={feedbackControl}
              onCambiarModoControl={handleCambiarModoControl}
              onEnviarControlManual={handleEnviarControlManual}
              onCambiarEscenario={handleCambiarEscenario}
              onReiniciarSimulacion={handleReiniciarSimulacion}
              onActualizar={() => void cargarDatos()}
            />
          )}
        </main>
      </div>

      {/* Modal de detalle de computadora */}
      <ZoneDetailModal
        zonaId={zonaModalId}
        zonaEstado={
          zonaModalId && estadoActual?.zonas
            ? estadoActual.zonas[zonaModalId]
            : null
        }
        darkMode={darkMode}
        ventiladorActivo={estadoActual?.ventilador_activo ?? false}
        zonaObjetivoActual={estadoActual?.zona_objetivo_actual ?? "zona1"}
        onClose={() => setZonaModalId(null)}
        onEnfriarZona={(zId, angulo, activar) => {
          handleEnviarControlManual(zId, angulo, activar);
        }}
      />

      {/* Modal de información académica del proyecto */}
      <ProjectInfoModal
        open={projectInfoOpen}
        darkMode={darkMode}
        onClose={() => setProjectInfoOpen(false)}
      />
    </div>
  );
}
