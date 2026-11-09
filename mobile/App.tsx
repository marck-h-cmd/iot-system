import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import {
  Clock,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import {
  AlertaActiva,
  AppSettings,
  EscenarioSimulacion,
  EstadoActualResponse,
  EventoControl,
  IndicadoresDetalladosResponse,
  IndicadoresResponse,
  ModoControl,
  PruebasEstadisticasResponse,
} from "./src/types/iot";
import { DARK_THEME, LIGHT_THEME } from "./src/styles/theme";
import {
  cambiarEscenarioMobile,
  cambiarModoControlMobile,
  detectDefaultApiUrl,
  enviarComandoManualMobile,
  fetchMobileDashboardBundle,
  reiniciarSimulacionMobile,
} from "./src/services/api";
import { BrandLogoNative } from "./src/components/BrandLogoNative";
import {
  BottomTabBar,
  PrimaryMobileTab,
} from "./src/components/BottomTabBar";
import { HomeMonitoringScreen } from "./src/screens/HomeMonitoringScreen";
import { IndicatorsScreen } from "./src/screens/IndicatorsScreen";
import { StatisticsScreen } from "./src/screens/StatisticsScreen";
import { ControlScreen } from "./src/screens/ControlScreen";
import { ZoneDetailScreen } from "./src/screens/ZoneDetailScreen";
import { EventsHistoryScreen } from "./src/screens/EventsHistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

type OverlayRoute =
  | { type: "none" }
  | { type: "zone_detail"; zonaId: string }
  | { type: "events_history" }
  | { type: "settings" };

const TAB_TITLES: Record<PrimaryMobileTab, string> = {
  monitoreo: "Monitoreo",
  indicadores: "Indicadores",
  estadisticas: "Estadísticas",
  control: "Control",
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    apiUrl: detectDefaultApiUrl(),
    pollingIntervalMs: 3000,
    darkMode: false,
  }));

  const [activeTab, setActiveTab] = useState<PrimaryMobileTab>("monitoreo");
  const [overlayRoute, setOverlayRoute] = useState<OverlayRoute>({
    type: "none",
  });
  const [zonaChart, setZonaChart] = useState<string>("zona1");

  const [estadoActual, setEstadoActual] =
    useState<EstadoActualResponse | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [indicadores, setIndicadores] =
    useState<IndicadoresResponse | null>(null);
  const [indicadoresDetallados, setIndicadoresDetallados] =
    useState<IndicadoresDetalladosResponse | null>(null);
  const [pruebasEstadisticas, setPruebasEstadisticas] =
    useState<PruebasEstadisticasResponse | null>(null);
  const [eventos, setEventos] = useState<EventoControl[]>([]);
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);

  const [connected, setConnected] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("--:--:--");

  const theme = settings.darkMode ? DARK_THEME : LIGHT_THEME;

  const sincronizarDatos = useCallback(async () => {
    try {
      const bundle = await fetchMobileDashboardBundle(settings.apiUrl);
      setEstadoActual(bundle.estadoActual);
      setHistorial(bundle.historial);
      if (bundle.indicadores) setIndicadores(bundle.indicadores);
      if (bundle.indicadoresDetallados)
        setIndicadoresDetallados(bundle.indicadoresDetallados);
      if (bundle.pruebasEstadisticas)
        setPruebasEstadisticas(bundle.pruebasEstadisticas);
      setEventos(bundle.eventos);
      setAlertas(bundle.alertas);
      setConnected(true);
      setLastSyncTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      setConnected(false);
    }
  }, [settings.apiUrl]);

  useEffect(() => {
    sincronizarDatos();
    const timer = setInterval(sincronizarDatos, settings.pollingIntervalMs);
    return () => clearInterval(timer);
  }, [sincronizarDatos, settings.pollingIntervalMs]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    await sincronizarDatos();
    setRefreshing(false);
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleQuickCool = async (
    zonaId: string,
    angulo: number,
    activar = true
  ) => {
    try {
      await enviarComandoManualMobile(settings.apiUrl, {
        zona: zonaId,
        ventilador_activo: activar,
        angulo_servo: angulo,
      });
      await sincronizarDatos();
    } catch {}
  };

  const handleCambiarModo = async (modo: ModoControl) => {
    await cambiarModoControlMobile(settings.apiUrl, modo);
    await sincronizarDatos();
  };

  const handleCambiarEscenario = async (escenario: EscenarioSimulacion) => {
    await cambiarEscenarioMobile(settings.apiUrl, escenario);
    await sincronizarDatos();
  };

  const handleReiniciarSimulacion = async () => {
    await reiniciarSimulacionMobile(settings.apiUrl);
    await sincronizarDatos();
  };

  const renderMainBody = () => {
    if (overlayRoute.type === "zone_detail") {
      const zId = overlayRoute.zonaId;
      return (
        <ZoneDetailScreen
          apiUrl={settings.apiUrl}
          zonaId={zId}
          zonaEstado={estadoActual?.zonas?.[zId] || null}
          ventiladorActivo={estadoActual?.ventilador_activo ?? false}
          zonaObjetivoActual={estadoActual?.zona_objetivo_actual || "zona1"}
          theme={theme}
          onBack={() => setOverlayRoute({ type: "none" })}
          onEnfriarEstacion={(id, ang, act) => handleQuickCool(id, ang, act)}
        />
      );
    }

    if (overlayRoute.type === "events_history") {
      return (
        <EventsHistoryScreen
          eventos={eventos}
          theme={theme}
          onBack={() => setOverlayRoute({ type: "none" })}
        />
      );
    }

    if (overlayRoute.type === "settings") {
      return (
        <SettingsScreen
          settings={settings}
          estadoActual={estadoActual}
          connected={connected}
          theme={theme}
          onUpdateSettings={handleUpdateSettings}
          onBack={() => setOverlayRoute({ type: "none" })}
        />
      );
    }

    if (activeTab === "monitoreo") {
      return (
        <HomeMonitoringScreen
          estadoActual={estadoActual}
          indicadores={indicadores}
          alertas={alertas}
          historial={historial}
          zonaChart={zonaChart}
          onSelectZonaChart={setZonaChart}
          onOpenZoneDetail={(zId) =>
            setOverlayRoute({ type: "zone_detail", zonaId: zId })
          }
          onQuickCoolZona={(zId, ang) => handleQuickCool(zId, ang, true)}
          theme={theme}
        />
      );
    }

    if (activeTab === "indicadores") {
      return (
        <IndicatorsScreen
          indicadores={indicadores}
          indicadoresDetallados={indicadoresDetallados}
          theme={theme}
        />
      );
    }

    if (activeTab === "estadisticas") {
      return (
        <StatisticsScreen
          pruebasEstadisticas={pruebasEstadisticas}
          theme={theme}
        />
      );
    }

    return (
      <ControlScreen
        estadoActual={estadoActual}
        eventos={eventos}
        theme={theme}
        onCambiarModo={handleCambiarModo}
        onEnviarComandoManual={(z, ang, fan) => handleQuickCool(z, ang, fan)}
        onCambiarEscenario={handleCambiarEscenario}
        onReiniciarSimulacion={handleReiniciarSimulacion}
        onOpenFullHistory={() => setOverlayRoute({ type: "events_history" })}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bgMain }]}
    >
      <StatusBar
        barStyle={settings.darkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.bgCard}
      />

      {/* Header Superior Compacto */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.bgCard,
            borderBottomColor: theme.borderCard,
          },
        ]}
      >
        <View style={styles.brandAndSection}>
          <BrandLogoNative theme={theme} compact />
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {overlayRoute.type === "none"
                ? TAB_TITLES[activeTab]
                : overlayRoute.type === "zone_detail"
                ? "Detalle de estación"
                : overlayRoute.type === "events_history"
                ? "Historial"
                : "Configuración"}
            </Text>
            <Text
              style={[styles.sectionSub, { color: theme.textSecondary }]}
            >
              Simulación ({estadoActual?.escenario_simulacion || "normal"}) •{" "}
              {estadoActual?.modo_control === "manual"
                ? "Manual"
                : "Automático"}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          {/* Estado de conexión */}
          <TouchableOpacity
            style={[
              styles.connPill,
              {
                backgroundColor: connected
                  ? theme.emeraldSoft
                  : theme.roseSoft,
              },
            ]}
            onPress={() => setOverlayRoute({ type: "settings" })}
          >
            {connected ? (
              <Wifi size={12} color={theme.emerald} />
            ) : (
              <WifiOff size={12} color={theme.rose} />
            )}
            <Text
              style={[
                styles.connText,
                { color: connected ? theme.emerald : theme.rose },
              ]}
            >
              {connected ? "Online" : "Offline"}
            </Text>
          </TouchableOpacity>

          {/* Selector rápido Claro / Oscuro */}
          <TouchableOpacity
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={() => handleUpdateSettings({ darkMode: !settings.darkMode })}
          >
            {settings.darkMode ? (
              <Sun size={15} color={theme.amber} />
            ) : (
              <Moon size={15} color={theme.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Historial */}
          <TouchableOpacity
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={() => setOverlayRoute({ type: "events_history" })}
          >
            <Clock size={15} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Ajustes */}
          <TouchableOpacity
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.bgSubCard,
                borderColor: theme.borderCard,
              },
            ]}
            onPress={() => setOverlayRoute({ type: "settings" })}
          >
            <Settings size={15} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal Scrollable */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={theme.accentPrimary}
          />
        }
      >
        {renderMainBody()}

        <View style={styles.syncFooter}>
          <RefreshCw size={11} color={theme.textSecondary} />
          <Text style={[styles.syncText, { color: theme.textSecondary }]}>
            Actualizado: {lastSyncTime}
          </Text>
        </View>
      </ScrollView>

      {/* Barra de Navegación Inferior (4 Pestañas Principales) */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setOverlayRoute({ type: "none" });
          setActiveTab(tab);
        }}
        theme={theme}
        alertCount={alertas.length}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandAndSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  connText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  syncFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 14,
  },
  syncText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
