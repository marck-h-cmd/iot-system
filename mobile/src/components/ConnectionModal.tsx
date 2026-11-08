import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X, Server, KeyRound, User, Wifi, Shield } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { BrokerConfig, ConnectionStatus } from '../types/iot';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  config: BrokerConfig;
  status: ConnectionStatus;
  statusError?: string;
  onSaveAndConnect: (newConfig: BrokerConfig) => void;
  onDisconnect: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  onClose,
  config,
  status,
  statusError,
  onSaveAndConnect,
  onDisconnect,
}) => {
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [path, setPath] = useState(config.path);
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState(config.password);
  const [clientId, setClientId] = useState(config.clientId);

  const handleApply = () => {
    onSaveAndConnect({
      host: host.trim(),
      port: Number(port.trim()) || 8083,
      path: path.trim(),
      username: username.trim(),
      password: password.trim(),
      clientId: clientId.trim() || `Mobile_${Math.random().toString(16).substring(2, 8)}`,
      useSsl: false,
    });
    onClose();
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return { label: 'CONECTADO', color: colors.emerald, bg: 'rgba(16, 185, 129, 0.15)' };
      case 'connecting':
        return { label: 'CONECTANDO...', color: colors.amber, bg: 'rgba(245, 158, 11, 0.15)' };
      case 'error':
        return { label: 'ERROR DE CONEXIÓN', color: colors.rose, bg: 'rgba(244, 63, 94, 0.15)' };
      default:
        return { label: 'DESCONECTADO', color: colors.textMuted, bg: 'rgba(100, 116, 139, 0.15)' };
    }
  };

  const badge = getStatusBadge();

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Server size={18} color={colors.cyan} />
              <Text style={styles.modalTitle}>Configuración del Bróker MQTT</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.statusBanner, { backgroundColor: badge.bg, borderColor: badge.color }]}>
              <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
              <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
            </View>

            {statusError && (
              <Text style={styles.errorText}>Detalle: {statusError}</Text>
            )}

            <View style={styles.sectionTitleRow}>
              <Wifi size={14} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Dirección y Transporte WebSocket</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Host / Dirección IP</Text>
              <TextInput
                style={styles.textInput}
                value={host}
                onChangeText={setHost}
                placeholder="192.168.1.5"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Puerto WS</Text>
                <TextInput
                  style={styles.textInput}
                  value={port}
                  onChangeText={setPort}
                  keyboardType="numeric"
                  placeholder="8083"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ruta WS</Text>
                <TextInput
                  style={styles.textInput}
                  value={path}
                  onChangeText={setPath}
                  placeholder="/mqtt"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.sectionTitleRow}>
              <Shield size={14} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Mecanismo de Seguridad y Autenticación</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Usuario MQTT</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="sensor_iot"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client ID</Text>
              <TextInput
                style={styles.textInput}
                value={clientId}
                onChangeText={setClientId}
                placeholder="Mobile_Client"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.connectButton} onPress={handleApply}>
                <Text style={styles.connectButtonText}>Guardar y Conectar</Text>
              </TouchableOpacity>

              {status === 'connected' && (
                <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
                  <Text style={styles.disconnectButtonText}>Desconectar</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 11,
    color: colors.rose,
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 10,
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: colors.cyan,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  disconnectButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: colors.rose,
    fontSize: 13,
    fontWeight: '700',
  },
});
