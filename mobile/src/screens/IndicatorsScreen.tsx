import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import {
  IndicadoresDetalladosResponse,
  IndicadoresResponse,
  EstadoMetaIndicador,
} from "../types/iot";
import { ThemePalette } from "../styles/theme";
import { CoolingEfficiencyGauge } from "../components/CoolingEfficiencyGauge";

interface IndicatorsScreenProps {
  indicadores: IndicadoresResponse | null;
  indicadoresDetallados: IndicadoresDetalladosResponse | null;
  theme: ThemePalette;
}

const DIM_FILTERS = [
  { id: "ALL", label: "Todas" },
  { id: "DIM-01", label: "Transmisión" },
  { id: "DIM-02", label: "Predicción IA" },
  { id: "DIM-03", label: "Control" },
  { id: "DIM-04", label: "Térmica" },
];

export const IndicatorsScreen: React.FC<IndicatorsScreenProps> = ({
  indicadores,
  indicadoresDetallados,
  theme,
}) => {
  const [selectedDim, setSelectedDim] = useState<string>("ALL");
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>(
    {}
  );

  const toggleExpand = (codigo: string) => {
    setExpandedCodes((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const dimensiones = indicadoresDetallados?.dimensiones || [];
  const filteredDims =
    selectedDim === "ALL"
      ? dimensiones
      : dimensiones.filter((d) => d.id === selectedDim);

  const getBadgeStyle = (estado: EstadoMetaIndicador | undefined) => {
    if (estado === "cumplida") {
      return {
        bg: theme.emeraldSoft,
        color: theme.emerald,
        label: "Meta cumplida",
        Icon: CheckCircle2,
      };
    }
    if (estado === "no_cumple") {
      return {
        bg: theme.amberSoft,
        color: theme.amber,
        label: "No cumple",
        Icon: AlertCircle,
      };
    }
    if (estado === "sin_meta_definida") {
      return {
        bg: theme.bgSubCard,
        color: theme.textSecondary,
        label: "Sin meta definida",
        Icon: Clock,
      };
    }
    return {
      bg: theme.bgSubCard,
      color: theme.textSecondary,
      label: "Sin datos suficientes",
      Icon: Clock,
    };
  };

  return (
    <View style={styles.container}>
      {/* Cabecera compacta de resumen */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.summaryTop}>
          <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>
            8 indicadores operacionales
          </Text>
          <View
            style={[
              styles.simTag,
              {
                backgroundColor: theme.amberSoft,
              },
            ]}
          >
            <Text style={[styles.simTagText, { color: theme.amber }]}>
              Simulación
            </Text>
          </View>
        </View>

        <View style={styles.summaryMetrics}>
          <View
            style={[styles.summaryMetricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <Text
              style={[styles.summaryMetricLabel, { color: theme.textSecondary }]}
            >
              Muestras
            </Text>
            <Text
              style={[styles.summaryMetricVal, { color: theme.textPrimary }]}
            >
              {indicadores?.total_lecturas ?? 0}
            </Text>
          </View>
          <View
            style={[styles.summaryMetricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <Text
              style={[styles.summaryMetricLabel, { color: theme.textSecondary }]}
            >
              Ciclos
            </Text>
            <Text
              style={[styles.summaryMetricVal, { color: theme.textPrimary }]}
            >
              {indicadores?.eventos_enfriamiento_completados ?? 0}
            </Text>
          </View>
          <View
            style={[styles.summaryMetricBox, { backgroundColor: theme.bgSubCard }]}
          >
            <Text
              style={[styles.summaryMetricLabel, { color: theme.textSecondary }]}
            >
              Pares IA
            </Text>
            <Text
              style={[styles.summaryMetricVal, { color: theme.textPrimary }]}
            >
              {indicadores?.muestras_ml ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Visualización Radial: Ciclo de Trabajo y Eficiencia */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text
          style={[
            styles.summaryTitle,
            { color: theme.textPrimary, marginBottom: 4 },
          ]}
        >
          Eficiencia Energética y Ciclo de Trabajo
        </Text>
        <CoolingEfficiencyGauge
          dutyCyclePercent={
            indicadores?.ahorro_energetico_estimado_pct != null
              ? Math.max(0, 100 - indicadores.ahorro_energetico_estimado_pct)
              : 28.5
          }
          ahorroEstimadoPercent={
            indicadores?.ahorro_energetico_estimado_pct ?? 70.0
          }
          ventiladorActivo={Boolean(
            (indicadores?.ahorro_energetico_estimado_pct ?? 0) < 100
          )}
          theme={theme}
        />
      </View>

      {/* Filtros por dimensión */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {DIM_FILTERS.map((f) => {
          const active = selectedDim === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active
                    ? theme.accentPrimary
                    : theme.bgCard,
                  borderColor: active
                    ? theme.accentPrimary
                    : theme.borderCard,
                },
              ]}
              onPress={() => setSelectedDim(f.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tarjetas por Dimensión */}
      {filteredDims.map((dim) => (
        <View
          key={dim.id}
          style={[
            styles.dimCard,
            { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
          ]}
        >
          <View style={styles.dimHeader}>
            <Text style={[styles.dimCode, { color: theme.textSecondary }]}>
              {dim.id} • {dim.variable}
            </Text>
            <Text style={[styles.dimTitle, { color: theme.textPrimary }]}>
              {dim.dimension}
            </Text>
          </View>

          <View style={styles.indList}>
            {dim.indicadores.map((ind) => {
              const badge = getBadgeStyle(ind.estado_meta);
              const BadgeIcon = badge.Icon;
              const isOpen = Boolean(expandedCodes[ind.codigo]);

              return (
                <View
                  key={ind.codigo}
                  style={[
                    styles.indCard,
                    {
                      backgroundColor: theme.bgSubCard,
                      borderColor: theme.borderCard,
                    },
                  ]}
                >
                  <View style={styles.indTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.indCode, { color: theme.textSecondary }]}
                      >
                        {ind.codigo}
                      </Text>
                      <Text
                        style={[styles.indName, { color: theme.textPrimary }]}
                      >
                        {ind.indicador}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.metaBadge,
                        { backgroundColor: badge.bg },
                      ]}
                    >
                      <BadgeIcon size={12} color={badge.color} />
                      <Text
                        style={[styles.metaBadgeText, { color: badge.color }]}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.valueRow}>
                    <View style={styles.valBaseline}>
                      <Text
                        style={[styles.mainVal, { color: theme.textPrimary }]}
                      >
                        {ind.valor != null ? ind.valor : "—"}
                      </Text>
                      {ind.valor != null && (
                        <Text
                          style={[
                            styles.unitText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {ind.unidad}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[styles.targetText, { color: theme.textSecondary }]}
                    >
                      Meta: {ind.meta}
                    </Text>
                  </View>

                  {/* Barra de progreso SOLO cuando tiene sentido cuantitativo */}
                  {ind.progreso_pct != null && (
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: theme.borderCard },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.max(0, ind.progreso_pct)
                            )}%`,
                            backgroundColor:
                              ind.estado_meta === "cumplida"
                                ? theme.emerald
                                : theme.amber,
                          },
                        ]}
                      />
                    </View>
                  )}

                  {/* Botón Detalles */}
                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={() => toggleExpand(ind.codigo)}
                  >
                    <Text
                      style={[
                        styles.detailsToggleText,
                        { color: theme.accentPrimary },
                      ]}
                    >
                      {isOpen ? "Ocultar detalles" : "Detalles"}
                    </Text>
                    {isOpen ? (
                      <ChevronUp size={14} color={theme.accentPrimary} />
                    ) : (
                      <ChevronDown size={14} color={theme.accentPrimary} />
                    )}
                  </TouchableOpacity>

                  {isOpen && (
                    <View
                      style={[
                        styles.detailsBody,
                        { borderTopColor: theme.borderCard },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailsText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {ind.interpretacion}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  simTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: 8,
  },
  summaryMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  summaryMetricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  summaryMetricVal: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dimCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  dimHeader: {
    gap: 2,
  },
  dimCode: {
    fontSize: 11,
    fontWeight: "600",
  },
  dimTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  indList: {
    gap: 10,
  },
  indCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  indTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  indCode: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  indName: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  valBaseline: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  mainVal: {
    fontSize: 22,
    fontWeight: "800",
  },
  unitText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  targetText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  detailsToggleText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  detailsBody: {
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailsText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
