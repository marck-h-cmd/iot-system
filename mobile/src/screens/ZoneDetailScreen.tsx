import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  ArrowLeft,
  Compass,
  Cpu,
  Droplets,
  Fan,
  Thermometer,
  TrendingUp,
} from "lucide-react-native";
import { ZonaEstado } from "../types/iot";
import { ThemePalette, ZONAS_CONFIG } from "../styles/theme";
import { fetchDetalleZonaMobile } from "../services/api";
import { ThermalLineChart } from "../components/ThermalLineChart";

interface ZoneDetailScreenProps {
  apiUrl: string;
  zonaId: string;
  zonaEstado: ZonaEstado | null;
  ventiladorActivo: boolean;
  zonaObjetivoActual: string;
  theme: ThemePalette;
  onBack: () => void;
  onEnfriarEstacion: (zonaId: string, angulo: number, activar: boolean) => void;
}

export const ZoneDetailScreen: React.FC<ZoneDetailScreenProps> = ({
  apiUrl,
  zonaId,
  zonaEstado,
  ventiladorActivo,
  zonaObjetivoActual,
  theme,
  onBack,
  onEnfriarEstacion,
}) => {
  const [serie, setSerie] = useState<any[]>([]);
  const [eventosEstacion, setEventosEstacion] = useState<any[]>([]);

  const cfg = ZONAS_CONFIG.find((c) => c.id === zonaId) || ZONAS_CONFIG[0];

  useEffect(() => {
    let mounted = true;
    fetchDetalleZonaMobile(apiUrl, zonaId)
      .then((data) => {
        if (!mounted) return;
        const points = (data.historial || [])
          .slice()
          .reverse()
          .map((item: any) => ({
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
        setSerie(points);
        setEventosEstacion(data.eventos_recientes || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [apiUrl, zonaId]);

  const temp = zonaEstado?.temperatura ?? 25.0;
  const pred = zonaEstado?.prediccion_10m ?? 25.0;
  const hum = zonaEstado?.humedad ?? 50.0;
  const angulo = zonaEstado?.angulo_servo ?? cfg.angulo;
  const isCoolingHere = ventiladorActivo && zonaObjetivoActual === zonaId;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.backBtn,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
        onPress={onBack}
      >
        <ArrowLeft size={16} color={theme.accentPrimary} />
        <Text style={[styles.backText, { color: theme.textPrimary }]}>
          Volver a Monitoreo
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.stationHeader}>
          <View
            style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}
          >
            <Cpu size={20} color={theme.accentPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.tagsRow}>
              <Text style={[styles.tagZone, { color: theme.accentPrimary }]}>
                {cfg.pc} • {angulo}°
              </Text>
              <Text style={[styles.tagSim, { color: theme.amber }]}>
                • Simulación
              </Text>
            </View>
            <Text style={[styles.stationTitle, { color: theme.textPrimary }]}>
              {zonaEstado?.nombre || cfg.nombre}
            </Text>
            <Text style={[styles.sensorSub, { color: theme.textSecondary }]}>
              Sensor: {zonaEstado?.sensor || cfg.sensor}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View
            style={[styles.metricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <View style={styles.metricTop}>
              <Thermometer size={13} color={theme.accentPrimary} />
              <Text
                style={[styles.metricLabel, { color: theme.textSecondary }]}
              >
                Temperatura
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
              {zonaEstado?.disponible === false
                ? "Sin señal"
                : `${temp.toFixed(1)} °C`}
            </Text>
          </View>

          <View
            style={[styles.metricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <View style={styles.metricTop}>
              <TrendingUp size={13} color={theme.cyan} />
              <Text
                style={[styles.metricLabel, { color: theme.textSecondary }]}
              >
                Predicción +10m
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: theme.cyan }]}>
              {pred.toFixed(1)} °C
            </Text>
          </View>

          <View
            style={[styles.metricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <View style={styles.metricTop}>
              <Droplets size={13} color={theme.accentPrimary} />
              <Text
                style={[styles.metricLabel, { color: theme.textSecondary }]}
              >
                Humedad
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
              {hum.toFixed(0)}%
            </Text>
          </View>

          <View
            style={[styles.metricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <View style={styles.metricTop}>
              <Compass size={13} color={theme.emerald} />
              <Text
                style={[styles.metricLabel, { color: theme.textSecondary }]}
              >
                Ángulo servo
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: theme.emerald }]}>
              {angulo}°
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Tendencia de {cfg.pc}
        </Text>
        <ThermalLineChart data={serie} theme={theme} />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Control sobre {cfg.pc}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: theme.accentPrimary },
            ]}
            onPress={() => onEnfriarEstacion(zonaId, angulo, true)}
          >
            <Fan size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>
              Orientar servo ({angulo}°) y enfriar
            </Text>
          </TouchableOpacity>

          {isCoolingHere && (
            <TouchableOpacity
              style={[
                styles.stopBtn,
                { backgroundColor: theme.roseSoft, borderColor: theme.rose },
              ]}
              onPress={() => onEnfriarEstacion(zonaId, angulo, false)}
            >
              <Text
                style={{ color: theme.rose, fontSize: 12, fontWeight: "700" }}
              >
                Detener
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {eventosEstacion.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Actividad reciente en {cfg.pc}
          </Text>
          {eventosEstacion.slice(0, 5).map((ev: any) => (
            <View
              key={ev.id}
              style={[
                styles.evItem,
                { borderBottomColor: theme.borderCard },
              ]}
            >
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 11.5,
                  fontWeight: "600",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {ev.motivo} ({ev.angulo_servo}°)
              </Text>
              <Text
                style={{
                  color: theme.emerald,
                  fontSize: 10.5,
                  fontWeight: "700",
                }}
              >
                Ejecutado (Sim)
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagSim: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  tagZone: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  stationTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  sensorSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  metricBox: {
    width: "48%",
    flexGrow: 1,
    padding: 11,
    borderRadius: 10,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  stopBtn: {
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  evItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: 8,
  },
});
