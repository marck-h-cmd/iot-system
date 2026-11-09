import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react-native";
import { EventoControl } from "../types/iot";
import { ThemePalette } from "../styles/theme";

interface EventsHistoryScreenProps {
  eventos: EventoControl[];
  theme: ThemePalette;
  onBack: () => void;
}

export const EventsHistoryScreen: React.FC<EventsHistoryScreenProps> = ({
  eventos,
  theme,
  onBack,
}) => {
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
          Volver
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.headerCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Historial de comandos y ACKs
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Registro cronológico de activaciones preventivas, reactivas y manuales
          en simulación.
        </Text>
      </View>

      {eventos.map((ev) => {
        const confirmado =
          Boolean(ev.confirmado_ack) ||
          ev.estado_comando === "EJECUTADO_SIMULACION";
        return (
          <View
            key={ev.id}
            style={[
              styles.eventCard,
              { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
            ]}
          >
            <View style={styles.topRow}>
              <Text style={[styles.zoneBadge, { color: theme.accentPrimary }]}>
                #{ev.id} • {ev.zona_objetivo.toUpperCase()} ({ev.angulo_servo}°)
              </Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: confirmado
                      ? theme.emeraldSoft
                      : theme.amberSoft,
                  },
                ]}
              >
                {confirmado ? (
                  <CheckCircle2 size={11} color={theme.emerald} />
                ) : (
                  <Clock size={11} color={theme.amber} />
                )}
                <Text
                  style={[
                    styles.statusText,
                    { color: confirmado ? theme.emerald : theme.amber },
                  ]}
                >
                  {confirmado ? "Ejecutado (Sim)" : "Pendiente"}
                </Text>
              </View>
            </View>

            <Text style={[styles.motivoText, { color: theme.textPrimary }]}>
              {ev.motivo}
            </Text>

            <View style={styles.metaRow}>
              <Text style={[styles.metaItem, { color: theme.textSecondary }]}>
                Ventilador:{" "}
                <Text
                  style={{
                    color: ev.estado_ventilador ? theme.emerald : theme.rose,
                    fontWeight: "700",
                  }}
                >
                  {ev.estado_ventilador ? "ON" : "OFF"}
                </Text>
              </Text>
              <Text style={[styles.metaItem, { color: theme.textSecondary }]}>
                Temp: {Number(ev.temperatura_disparo).toFixed(1)} °C
                {ev.temperatura_posterior != null
                  ? ` → ${Number(ev.temperatura_posterior).toFixed(1)} °C`
                  : ""}
              </Text>
              <Text style={[styles.metaItem, { color: theme.textSecondary }]}>
                ACK:{" "}
                {ev.latencia_ms != null
                  ? `${Number(ev.latencia_ms).toFixed(1)} ms`
                  : "—"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
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
  headerCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  eventCard: {
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneBadge: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  motivoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  metaItem: {
    fontSize: 11,
    fontWeight: "500",
  },
});
