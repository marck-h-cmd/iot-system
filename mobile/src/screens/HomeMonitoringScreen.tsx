import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  AlertTriangle,
  Compass,
  Fan,
  Thermometer,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import {
  AlertaActiva,
  EstadoActualResponse,
  IndicadoresResponse,
} from "../types/iot";
import { ThemePalette, ZONAS_CONFIG } from "../styles/theme";
import { ThermalLineChart } from "../components/ThermalLineChart";
import { MultiZoneThermalBarChart } from "../components/MultiZoneThermalBarChart";

interface HomeMonitoringScreenProps {
  estadoActual: EstadoActualResponse | null;
  indicadores: IndicadoresResponse | null;
  alertas: AlertaActiva[];
  historial: any[];
  zonaChart: string;
  onSelectZonaChart: (z: string) => void;
  onOpenZoneDetail: (zonaId: string) => void;
  onQuickCoolZona: (zonaId: string, angulo: number) => void;
  theme: ThemePalette;
}

export const HomeMonitoringScreen: React.FC<HomeMonitoringScreenProps> = ({
  estadoActual,
  indicadores,
  alertas,
  historial,
  zonaChart,
  onSelectZonaChart,
  onOpenZoneDetail,
  onQuickCoolZona,
  theme,
}) => {
  const [alertExpanded, setAlertExpanded] = useState(false);

  const zonasMap = estadoActual?.zonas || {};
  const zonasValidas = Object.values(zonasMap).filter(
    (z) => z.disponible !== false
  );

  const maxTemp =
    zonasValidas.length > 0
      ? Math.max(...zonasValidas.map((z) => z.temperatura))
      : 0;
  const avgTemp =
    zonasValidas.length > 0
      ? zonasValidas.reduce((acc, z) => acc + z.temperatura, 0) /
        zonasValidas.length
      : 0;

  const activeZoneId = estadoActual?.zona_objetivo_actual || "zona1";
  const activePcCfg =
    ZONAS_CONFIG.find((c) => c.id === activeZoneId) || ZONAS_CONFIG[0];

  const serieChart = historial
    .filter((item) => item.zona === zonaChart)
    .slice(0, 20)
    .reverse()
    .map((item) => ({
      hora: item.fecha_registro
        ? new Date(item.fecha_registro).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "--:--",
      temperatura: Number(item.temperatura),
      prediccion: Number(item.prediccion_10m || item.temperatura),
    }));

  return (
    <View style={styles.container}>
      {/* Barra compacta de alertas */}
      {alertas.length > 0 && (
        <View
          style={[
            styles.alertBar,
            {
              backgroundColor: theme.roseSoft,
              borderColor: theme.rose,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.alertSummaryRow}
            onPress={() => setAlertExpanded((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.alertLeft}>
              <AlertTriangle size={15} color={theme.rose} />
              <Text style={[styles.alertTitle, { color: theme.rose }]}>
                {alertas.length}{" "}
                {alertas.length === 1 ? "alerta activa" : "alertas activas"}
              </Text>
              <Text
                style={[styles.alertInlineMsg, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                • {alertas[0].estacion}
              </Text>
            </View>
            {alertExpanded ? (
              <ChevronUp size={15} color={theme.rose} />
            ) : (
              <ChevronDown size={15} color={theme.rose} />
            )}
          </TouchableOpacity>

          {alertExpanded && (
            <View
              style={[
                styles.alertDetailsList,
                { borderTopColor: theme.borderCard },
              ]}
            >
              {alertas.map((al, i) => (
                <TouchableOpacity
                  key={`${al.zona_id}-${i}`}
                  style={styles.alertDetailItem}
                  onPress={() => onOpenZoneDetail(al.zona_id)}
                >
                  <Text
                    style={[styles.alertDetailText, { color: theme.textPrimary }]}
                  >
                    <Text style={{ fontWeight: "700" }}>{al.estacion}:</Text>{" "}
                    {al.mensaje}
                  </Text>
                  <ChevronRight size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tarjeta Principal Destacada (Hero Card) */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.bgCard,
            borderColor: maxTemp >= 35 ? theme.rose : theme.borderCard,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View>
            <Text style={[styles.heroCaption, { color: theme.textSecondary }]}>
              Temperatura máxima
            </Text>
            <View style={styles.heroValueRow}>
              <Text
                style={[
                  styles.heroMainTemp,
                  { color: maxTemp >= 35 ? theme.rose : theme.textPrimary },
                ]}
              >
                {maxTemp.toFixed(1)} °C
              </Text>
              <View
                style={[
                  styles.heroStatePill,
                  {
                    backgroundColor:
                      maxTemp >= 35 ? theme.roseSoft : theme.emeraldSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroStateText,
                    { color: maxTemp >= 35 ? theme.rose : theme.emerald },
                  ]}
                >
                  {maxTemp >= 35 ? "Crítico" : "Estable"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroRightCol}>
            <Text style={[styles.heroCaption, { color: theme.textSecondary }]}>
              Promedio (5 PCs)
            </Text>
            <Text style={[styles.heroAvgTemp, { color: theme.textPrimary }]}>
              {avgTemp.toFixed(1)} °C
            </Text>
          </View>
        </View>

        <View
          style={[styles.heroDivider, { backgroundColor: theme.borderCard }]}
        />

        <View style={styles.heroSubMetrics}>
          <View style={styles.heroSubItem}>
            <Fan
              size={14}
              color={
                estadoActual?.ventilador_activo
                  ? theme.emerald
                  : theme.textSecondary
              }
            />
            <Text style={[styles.heroSubLabel, { color: theme.textSecondary }]}>
              Ventilador:
            </Text>
            <Text
              style={[
                styles.heroSubVal,
                {
                  color: estadoActual?.ventilador_activo
                    ? theme.emerald
                    : theme.textPrimary,
                },
              ]}
            >
              {estadoActual?.ventilador_activo ? "Encendido" : "En reposo"}
            </Text>
          </View>

          <View style={styles.heroSubItem}>
            <Compass size={14} color={theme.accentPrimary} />
            <Text style={[styles.heroSubLabel, { color: theme.textSecondary }]}>
              Zona activa:
            </Text>
            <Text style={[styles.heroSubVal, { color: theme.textPrimary }]}>
              {activePcCfg.pc} ({estadoActual?.ultimo_angulo_servo ?? 90}°)
            </Text>
          </View>
        </View>
      </View>

      {/* Lista Compacta de las 5 Zonas Térmicas */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Estaciones monitoreadas
          </Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            Toca una PC para ver su detalle
          </Text>
        </View>

        <View style={styles.zoneList}>
          {ZONAS_CONFIG.map((cfg, index) => {
            const z = zonasMap[cfg.id];
            const temp = z?.temperatura ?? 25.0;
            const pred = z?.prediccion_10m ?? 25.0;
            const sinSenal = z?.disponible === false;
            const isCrit = !sinSenal && temp >= 35.0;
            const isWarn =
              !sinSenal && !isCrit && (temp >= 31.0 || pred >= 35.0);
            const isCoolingHere =
              estadoActual?.ventilador_activo &&
              estadoActual?.zona_objetivo_actual === cfg.id;

            return (
              <TouchableOpacity
                key={cfg.id}
                style={[
                  styles.zoneRow,
                  index < ZONAS_CONFIG.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.borderCard,
                  },
                ]}
                onPress={() => onOpenZoneDetail(cfg.id)}
                activeOpacity={0.75}
              >
                <View style={styles.zoneRowLeft}>
                  <View
                    style={[
                      styles.pcTag,
                      {
                        backgroundColor: isCoolingHere
                          ? theme.accentSoft
                          : theme.bgSubCard,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pcTagText,
                        {
                          color: isCoolingHere
                            ? theme.accentPrimary
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {cfg.pc}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.zoneName, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {z?.nombre || cfg.nombre}
                    </Text>
                    <Text
                      style={[
                        styles.zoneMeta,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {cfg.angulo}° • Pred. +10m: {pred.toFixed(1)} °C
                    </Text>
                  </View>
                </View>

                <View style={styles.zoneRowRight}>
                  <View style={styles.tempAndBadge}>
                    <Text
                      style={[
                        styles.zoneTemp,
                        {
                          color: sinSenal
                            ? theme.textSecondary
                            : isCrit
                            ? theme.rose
                            : isWarn
                            ? theme.amber
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {sinSenal ? "Fallo" : `${temp.toFixed(1)} °C`}
                    </Text>
                    <View
                      style={[
                        styles.miniStatusBadge,
                        {
                          backgroundColor: sinSenal
                            ? theme.bgSubCard
                            : isCrit
                            ? theme.roseSoft
                            : isWarn
                            ? theme.amberSoft
                            : theme.emeraldSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.miniStatusText,
                          {
                            color: sinSenal
                              ? theme.textSecondary
                              : isCrit
                              ? theme.rose
                              : isWarn
                              ? theme.amber
                              : theme.emerald,
                          },
                        ]}
                      >
                        {sinSenal
                          ? "Sin señal"
                          : isCrit
                          ? "Crítico"
                          : isWarn
                          ? "Alerta"
                          : "Normal"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.quickFanBtn,
                      {
                        backgroundColor: isCoolingHere
                          ? theme.accentPrimary
                          : theme.bgSubCard,
                        borderColor: isCoolingHere
                          ? theme.accentPrimary
                          : theme.borderCard,
                      },
                    ]}
                    onPress={() => onQuickCoolZona(cfg.id, cfg.angulo)}
                  >
                    <Fan
                      size={13}
                      color={isCoolingHere ? "#FFFFFF" : theme.textSecondary}
                    />
                  </TouchableOpacity>
                  <ChevronRight size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gráfico Comparativo de Barras Térmicas (5 PCs) */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <MultiZoneThermalBarChart
          zonasConfig={ZONAS_CONFIG}
          estadoActual={estadoActual}
          selectedZone={zonaChart}
          onSelectZone={onSelectZonaChart}
          theme={theme}
        />
      </View>

      {/* Gráfico Simplificado */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Tendencia térmica y predicción
          </Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            Observada vs proyección a +10 min
          </Text>
        </View>

        <View style={styles.pcPillsRow}>
          {ZONAS_CONFIG.map((zc) => {
            const active = zonaChart === zc.id;
            return (
              <TouchableOpacity
                key={zc.id}
                style={[
                  styles.pcPill,
                  {
                    backgroundColor: active
                      ? theme.accentPrimary
                      : theme.bgSubCard,
                    borderColor: active
                      ? theme.accentPrimary
                      : theme.borderCard,
                  },
                ]}
                onPress={() => onSelectZonaChart(zc.id)}
              >
                <Text
                  style={[
                    styles.pcPillText,
                    { color: active ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {zc.pc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ThermalLineChart data={serieChart} theme={theme} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  alertBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  alertInlineMsg: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  alertDetailsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  alertDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  alertDetailText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  heroCard: {
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroCaption: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  heroMainTemp: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroStateText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroRightCol: {
    alignItems: "flex-end",
  },
  heroAvgTemp: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  heroDivider: {
    height: 1,
    marginVertical: 12,
  },
  heroSubMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  heroSubItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroSubLabel: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  heroSubVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  zoneList: {
    marginTop: 2,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 8,
  },
  zoneRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pcTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
  },
  pcTagText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  zoneName: {
    fontSize: 13,
    fontWeight: "600",
  },
  zoneMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  zoneRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tempAndBadge: {
    alignItems: "flex-end",
  },
  zoneTemp: {
    fontSize: 15,
    fontWeight: "700",
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  miniStatusText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  quickFanBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pcPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  pcPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  pcPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
});
