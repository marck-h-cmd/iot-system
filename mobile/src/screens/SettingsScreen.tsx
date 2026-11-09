import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Moon,
  Server,
  Sun,
  Wifi,
} from "lucide-react-native";
import { AppSettings, EstadoActualResponse } from "../types/iot";
import { ThemePalette } from "../styles/theme";
import { testBackendHealthMobile } from "../services/api";

interface SettingsScreenProps {
  settings: AppSettings;
  estadoActual: EstadoActualResponse | null;
  connected: boolean;
  theme: ThemePalette;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onBack: () => void;
}

const URL_PRESETS = [
  { label: "Navegador web local", url: "http://localhost:8000" },
  { label: "Red Wi-Fi LAN (PC Host)", url: "http://192.168.0.23:8000" },
  { label: "Emulador Android AVD", url: "http://10.0.2.2:8000" },
];

const INTERVALS = [2000, 3000, 5000, 10000];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  estadoActual,
  connected,
  theme,
  onUpdateSettings,
  onBack,
}) => {
  const [urlInput, setUrlInput] = useState<string>(settings.apiUrl);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSaveAndTest = async (targetUrl?: string) => {
    const clean = (targetUrl ?? urlInput).trim().replace(/\/+$/, "");
    setUrlInput(clean);
    onUpdateSettings({ apiUrl: clean });
    setTesting(true);
    setTestResult(null);
    try {
      const health = await testBackendHealthMobile(clean);
      setTestResult(
        `Conexión exitosa (${health.version || "3.0"}) • Modo: ${
          health.modo_operacion || "simulación"
        }`
      );
    } catch {
      setTestResult(
        `No se pudo conectar a ${clean}. Verifica que el backend esté activo en el puerto 8000.`
      );
    } finally {
      setTesting(false);
    }
  };

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

      {/* Apariencia y Frecuencia */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Apariencia y sincronización
        </Text>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Tema visual
        </Text>
        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[
              styles.themeBtn,
              {
                backgroundColor: !settings.darkMode
                  ? theme.accentSoft
                  : theme.bgSubCard,
                borderColor: !settings.darkMode
                  ? theme.accentPrimary
                  : theme.borderCard,
              },
            ]}
            onPress={() => onUpdateSettings({ darkMode: false })}
          >
            <Sun
              size={15}
              color={
                !settings.darkMode ? theme.accentPrimary : theme.textSecondary
              }
            />
            <Text
              style={{
                color: !settings.darkMode
                  ? theme.accentPrimary
                  : theme.textPrimary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Modo claro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeBtn,
              {
                backgroundColor: settings.darkMode
                  ? theme.accentSoft
                  : theme.bgSubCard,
                borderColor: settings.darkMode
                  ? theme.accentPrimary
                  : theme.borderCard,
              },
            ]}
            onPress={() => onUpdateSettings({ darkMode: true })}
          >
            <Moon
              size={15}
              color={
                settings.darkMode ? theme.accentPrimary : theme.textSecondary
              }
            />
            <Text
              style={{
                color: settings.darkMode
                  ? theme.accentPrimary
                  : theme.textPrimary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Modo oscuro
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.fieldLabel,
            { color: theme.textSecondary, marginTop: 6 },
          ]}
        >
          Intervalo de actualización
        </Text>
        <View style={styles.intervalRow}>
          {INTERVALS.map((ms) => {
            const active = settings.pollingIntervalMs === ms;
            return (
              <TouchableOpacity
                key={ms}
                style={[
                  styles.intervalBtn,
                  {
                    backgroundColor: active
                      ? theme.accentPrimary
                      : theme.bgSubCard,
                    borderColor: active
                      ? theme.accentPrimary
                      : theme.borderCard,
                  },
                ]}
                onPress={() => onUpdateSettings({ pollingIntervalMs: ms })}
              >
                <Text
                  style={{
                    color: active ? "#FFFFFF" : theme.textPrimary,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {ms / 1000}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* URL del Backend FastAPI */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.headerRow}>
          <Server size={16} color={theme.accentPrimary} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Conexión con backend (FastAPI)
          </Text>
        </View>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Sincroniza telemetría, indicadores y control con el servidor en el
          puerto 8000.
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.bgSubCard,
              borderColor: theme.borderCard,
              color: theme.textPrimary,
            },
          ]}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.0.23:8000"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.presetsCol}>
          {URL_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.url}
              style={[
                styles.presetBtn,
                {
                  backgroundColor:
                    urlInput === p.url ? theme.accentSoft : theme.bgSubCard,
                  borderColor:
                    urlInput === p.url
                      ? theme.accentPrimary
                      : theme.borderCard,
                },
              ]}
              onPress={() => handleSaveAndTest(p.url)}
            >
              <Text
                style={[
                  styles.presetLabel,
                  {
                    color:
                      urlInput === p.url
                        ? theme.accentPrimary
                        : theme.textPrimary,
                  },
                ]}
              >
                {p.label}
              </Text>
              <Text style={[styles.presetUrl, { color: theme.textSecondary }]}>
                {p.url}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.accentPrimary }]}
          onPress={() => handleSaveAndTest()}
          disabled={testing}
        >
          <Wifi size={15} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {testing ? "Probando enlace..." : "Guardar y probar conexión"}
          </Text>
        </TouchableOpacity>

        {testResult && (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.accentPrimary,
              },
            ]}
          >
            <CheckCircle2 size={14} color={theme.accentPrimary} />
            <Text style={[styles.resultText, { color: theme.textPrimary }]}>
              {testResult}
            </Text>
          </View>
        )}
      </View>

      {/* Acerca del Proyecto Universitario */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
        ]}
      >
        <View style={styles.headerRow}>
          <GraduationCap size={16} color={theme.accentPrimary} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Acerca del proyecto
          </Text>
        </View>
        <Text style={[styles.projectFullTitle, { color: theme.textPrimary }]}>
          Sistema de Enfriamiento Autónomo Inteligente para Equipos Electrónicos
          (IoT)
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Universidad Nacional de Trujillo (UNT) • Monitoreo de 5 estaciones,
          predicción térmica con Scikit-Learn (+10 min) y control direccional
          simulado (0°–180°).
        </Text>

        <View
          style={[styles.diagDivider, { backgroundColor: theme.borderCard }]}
        />

        <View style={styles.diagRow}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            API FastAPI:
          </Text>
          <Text
            style={{
              color: connected ? theme.emerald : theme.rose,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {connected ? "Conectado" : "Sin conexión"}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Broker MQTT EMQX:
          </Text>
          <Text
            style={{
              color: estadoActual?.mqtt_conectado ? theme.emerald : theme.amber,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {estadoActual?.mqtt_conectado ? "Online" : "Esperando"}
          </Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            Modo operativo:
          </Text>
          <Text
            style={{ color: theme.textPrimary, fontSize: 12, fontWeight: "700" }}
          >
            Simulación ({estadoActual?.escenario_simulacion || "normal"})
          </Text>
        </View>
      </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  projectFullTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: "600",
  },
  presetsCol: {
    gap: 6,
  },
  presetBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  presetUrl: {
    fontSize: 11,
    fontWeight: "500",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  intervalRow: {
    flexDirection: "row",
    gap: 8,
  },
  intervalBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  diagDivider: {
    height: 1,
    marginVertical: 2,
  },
  diagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
});
