import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { PruebasEstadisticasResponse } from "../types/iot";
import { ThemePalette } from "../styles/theme";
import { StatisticalDistributionChart } from "../components/StatisticalDistributionChart";

interface StatisticsScreenProps {
  pruebasEstadisticas: PruebasEstadisticasResponse | null;
  theme: ThemePalette;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({
  pruebasEstadisticas,
  theme,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const pruebas = pruebasEstadisticas?.pruebas || [];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      {/* Cabecera compacta */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Pruebas inferenciales (α = 0.05)
          </Text>
          <View
            style={[
              styles.simPill,
              {
                backgroundColor: theme.amberSoft,
              },
            ]}
          >
            <Text style={[styles.simPillText, { color: theme.amber }]}>
              Simulación
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Toca cualquier tarjeta para desplegar las hipótesis H₀, H₁ y la
          interpretación estadística completa.
        </Text>
      </View>

      {/* Gráfico Científico: Distribución Gaussiana de Residuos */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <StatisticalDistributionChart theme={theme} />
      </View>

      {/* Tarjetas resumidas de las 4 pruebas */}
      {pruebas.map((p) => {
        const isOpen = Boolean(expandedIds[p.id]);
        const suficiente = p.suficiente;
        const esFavorable = p.es_favorable ?? (suficiente && p.rechaza_h0);
        const badgeBg = !suficiente
          ? theme.bgSubCard
          : esFavorable
          ? theme.emeraldSoft
          : theme.amberSoft;
        const badgeColor = !suficiente
          ? theme.textSecondary
          : esFavorable
          ? theme.emerald
          : theme.amber;
        const BadgeIcon = !suficiente
          ? Clock
          : esFavorable
          ? CheckCircle2
          : AlertCircle;

        return (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.testCard,
              { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
            ]}
            onPress={() => toggleExpand(p.id)}
            activeOpacity={0.85}
          >
            <View style={styles.testHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.testId, { color: theme.textSecondary }]}>
                  {p.id} • {p.variable_evaluada}
                </Text>
                <Text style={[styles.testTitle, { color: theme.textPrimary }]}>
                  {p.nombre_corto || p.nombre_prueba}
                </Text>
              </View>

              <View
                style={[styles.resultBadge, { backgroundColor: badgeBg }]}
              >
                <BadgeIcon size={12} color={badgeColor} />
                <Text style={[styles.resultText, { color: badgeColor }]}>
                  {p.resultado_breve ||
                    (!suficiente
                      ? "Muestra insuficiente"
                      : p.rechaza_h0
                      ? "Diferencia significativa (p < 0.05)"
                      : "Sin evidencia significativa (p ≥ 0.05)")}
                </Text>
              </View>
            </View>

            {/* 3 Métricas principales legibles */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: theme.bgSubCard },
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
                  Estadístico
                </Text>
                <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
                  {p.estadistico_valor != null ? p.estadistico_valor : "—"}
                </Text>
              </View>

              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: theme.bgSubCard },
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
                  p-valor
                </Text>
                <Text
                  style={[
                    styles.metricVal,
                    { color: suficiente ? theme.accentPrimary : theme.textSecondary },
                  ]}
                >
                  {p.p_valor != null
                    ? p.p_valor < 0.0001
                      ? "< 0.0001"
                      : p.p_valor.toFixed(4)
                    : "—"}
                </Text>
              </View>

              <View
                style={[
                  styles.metricBox,
                  { backgroundColor: theme.bgSubCard },
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
                  Muestra (n)
                </Text>
                <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
                  {p.n_muestras}{" "}
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: "500",
                      color: theme.textSecondary,
                    }}
                  >
                    / {p.minimo_requerido}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Indicador de desplegable */}
            <View style={styles.expandFooter}>
              <Text
                style={[styles.expandLabel, { color: theme.accentPrimary }]}
              >
                {isOpen ? "Ocultar análisis" : "Ver análisis"}
              </Text>
              {isOpen ? (
                <ChevronUp size={15} color={theme.accentPrimary} />
              ) : (
                <ChevronDown size={15} color={theme.accentPrimary} />
              )}
            </View>

            {/* Desglose completo al tocar */}
            {isOpen && (
              <View
                style={[
                  styles.analysisBox,
                  {
                    backgroundColor: theme.bgSubCard,
                    borderColor: theme.borderCard,
                  },
                ]}
              >
                <Text
                  style={[styles.hypoLine, { color: theme.textSecondary }]}
                >
                  <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>
                    H₀:{" "}
                  </Text>
                  {p.hipotesis_nula_h0}
                </Text>
                <Text
                  style={[
                    styles.hypoLine,
                    { color: theme.textSecondary, marginTop: 4 },
                  ]}
                >
                  <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>
                    H₁:{" "}
                  </Text>
                  {p.hipotesis_alternativa_h1}
                </Text>
                <View
                  style={[
                    styles.analysisDivider,
                    { backgroundColor: theme.borderCard },
                  ]}
                />
                <Text
                  style={[
                    styles.conclusionText,
                    { color: theme.textPrimary },
                  ]}
                >
                  {p.conclusion}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  simPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  testCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  testId: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  testTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    marginTop: 2,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resultText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  metricVal: {
    fontSize: 14.5,
    fontWeight: "800",
    marginTop: 2,
  },
  expandFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  expandLabel: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  analysisBox: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  hypoLine: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  analysisDivider: {
    height: 1,
    marginVertical: 8,
  },
  conclusionText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },
});
