import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Wind, Settings, Wifi, RefreshCw } from 'lucide-react-native';
import { colors, zoneConfigurations } from './src/styles/theme';
import { mqttService } from './src/services/mqttClient';
import { TelemetryPayload, ConnectionStatus, BrokerConfig } from './src/types/iot';
import { ZoneCard } from './src/components/ZoneCard';
import { HeroMetrics } from './src/components/HeroMetrics';
import { ControlPanel } from './src/components/ControlPanel';
import { ConnectionModal } from './src/components/ConnectionModal';

export default function App() {
  const [telemetry, setTelemetry] = useState<Record<string, TelemetryPayload>>({});
  const [fanActive, setFanActive] = useState<boolean>(false);
  const [currentAngle, setCurrentAngle] = useState<number>(90);
  const [targetZone, setTargetZone] = useState<string>('zona3');
  const [latencyMs, setLatencyMs] = useState<number>(42);
  const [packetsCount, setPacketsCount] = useState<number>(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusError, setStatusError] = useState<string | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const unsubTelemetry = mqttService.onTelemetry((data) => {
      setTelemetry((prev) => ({
        ...prev,
        [data.zona]: data,
      }));
      setPacketsCount((prev) => prev + 1);

      if (data.estado_ventilador !== undefined) {
        setFanActive(data.estado_ventilador === 1);
      }
      if (data.angulo_servo !== undefined) {
        setCurrentAngle(data.angulo_servo);
      }
    });

    const unsubAction = mqttService.onAction((action) => {
      setFanActive(action.fan_state === 1);
      setCurrentAngle(action.servo_angle);
      setTargetZone(action.zona_objetivo);
    });

    const unsubAck = mqttService.onAck((ack) => {
      if (ack.latencia_ejecucion_ms) {
        setLatencyMs(ack.latencia_ejecucion_ms);
      }
    });

    const unsubStatus = mqttService.onStatusChange((newStatus, error) => {
      setStatus(newStatus);
      setStatusError(error);
    });

    mqttService.connect();

    return () => {
      unsubTelemetry();
      unsubAction();
      unsubAck();
      unsubStatus();
      mqttService.disconnect();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    mqttService.connect();
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleSaveConfig = (newConfig: BrokerConfig) => {
    mqttService.connect(newConfig);
  };

  const handleDisconnect = () => {
    mqttService.disconnect();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return colors.emerald;
      case 'connecting':
        return colors.amber;
      case 'error':
        return colors.rose;
      default:
        return colors.textMuted;
    }
  };

  const currentBrokerConfig = mqttService.getConfig();
  const targetZoneLabel = zoneConfigurations[targetZone]?.nombre || targetZone;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.brandingRow}>
          <View style={styles.iconContainer}>
            <Wind size={20} color={colors.cyan} />
          </View>
          <View>
            <Text style={styles.appTitle}>
              SMART <Text style={{ color: colors.cyan }}>COOLING</Text>
            </Text>
            <Text style={styles.appSubtitle}>Laboratorio UNT • Cliente Móvil MQTT</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.statusPill, { borderColor: getStatusColor() }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
              {status === 'connected'
                ? 'MQTT OK'
                : status === 'connecting'
                ? 'CONECTANDO'
                : status === 'error'
                ? 'ERROR'
                : 'OFFLINE'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Settings size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cyan}
            colors={[colors.cyan]}
          />
        }
      >
        <HeroMetrics
          fanActive={fanActive}
          currentAngle={currentAngle}
          targetZoneName={targetZoneLabel}
          latencyMs={latencyMs}
          packetsCount={packetsCount}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Matriz Térmica en Tiempo Real</Text>
          <Text style={styles.sectionBadge}>5 PUESTOS</Text>
        </View>

        {Object.entries(zoneConfigurations).map(([key, info]) => {
          const item = telemetry[key];
          const isTarget = targetZone === key && fanActive;

          return (
            <ZoneCard
              key={key}
              zoneId={key}
              nombre={info.nombre}
              tipo={info.tipo}
              sensorLabel={info.sensorLabel}
              angulo={info.angulo}
              temperatura={item ? item.temperatura : null}
              temperaturaPredicha={item ? item.temperatura_predicha : null}
              isActiveTarget={isTarget}
            />
          );
        })}

        <ControlPanel
          currentFanState={fanActive ? 1 : 0}
          currentAngle={currentAngle}
          currentZone={targetZone}
        />

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Broker: {currentBrokerConfig.host}:{currentBrokerConfig.port}
          </Text>
          <Text style={styles.footerText}>Protocolo: MQTT v3.1.1 sobre WebSocket</Text>
        </View>
      </ScrollView>

      <ConnectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        config={currentBrokerConfig}
        status={status}
        statusError={statusError}
        onSaveAndConnect={handleSaveConfig}
        onDisconnect={handleDisconnect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: '#0c121e',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.cyan,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  footerInfo: {
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginVertical: 1,
  },
});
