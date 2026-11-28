import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X, Server, Wifi, Shield } from 'lucide-react-native';
import { colors, ThemePalette } from '../styles/theme';
import { BrokerConfig, ConnectionStatus } from '../types/iot';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  config: BrokerConfig;
  status: ConnectionStatus;
  statusError?: string;
  onSaveAndConnect: (newConfig: BrokerConfig) => void;
  onDisconnect: () => void;
  theme?: ThemePalette;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  onClose,
  config,
  status,
  statusError,
  onSaveAndConnect,
  onDisconnect,
  theme,
}) => {
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [path, setPath] = useState(config.path);
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState(config.password);
  const [clientId, setClientId] = useState(config.clientId);
  const [useSsl, setUseSsl] = useState(Boolean(config.useSsl || config.port === 443));

  useEffect(() => {
    if (visible) {
      setHost(config.host);
      setPort(String(config.port));
      setPath(config.path);
      setUsername(config.username);
      setPassword(config.password);
      setClientId(config.clientId);
      setUseSsl(Boolean(config.useSsl || config.port === 443));
    }
  }, [visible, config]);

  const handleHostChange = (text: string) => {
    let clean = text.trim();
    if (clean.startsWith('https://')) {
      clean = clean.replace('https://', '');
      setUseSsl(true);
      if (port === '8083') setPort('443');
    } else if (clean.startsWith('http://')) {
      clean = clean.replace('http://', '');
    } else if (clean.startsWith('wss://')) {
      clean = clean.replace('wss://', '');
      setUseSsl(true);
      if (port === '8083') setPort('443');
    } else if (clean.startsWith('ws://')) {
      clean = clean.replace('ws://', '');
    }

    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[0];
      if (parts[1]) setPath('/' + parts.slice(1).join('/'));
    }

    if (clean.includes('ngrok') || clean.includes('trycloudflare') || clean.includes('.app')) {
      setUseSsl(true);
      if (port === '8083') setPort('443');
    }

    setHost(clean);
  };

  const handleApply = () => {
    let cleanHost = host.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^wss?:\/\//i, '')
      .replace(/\/.*$/, '');

    const isDomain = cleanHost.includes('ngrok') || cleanHost.includes('cloudflare') || cleanHost.includes('.app');
    const isSsl = useSsl || isDomain || port.trim() === '443';
    const finalPort = Number(port.trim()) || (isSsl ? 443 : 8083);

    onSaveAndConnect({
      host: cleanHost,
      port: finalPort,
      path: path.trim() || '/mqtt',
      username: username.trim(),
      password: password.trim(),
      clientId: clientId.trim() || `Mobile_${Math.random().toString(16).substring(2, 8)}`,
      useSsl: isSsl,
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

  const isDark = !theme || theme.dark;
  const cardBg = isDark ? colors.surface : (theme?.bgElevated || '#FFFFFF');
  const borderColor = isDark ? colors.surfaceBorder : (theme?.borderCard || '#E2E8F0');
  const textColor = isDark ? colors.textPrimary : (theme?.textPrimary || '#0F172A');
  const textSub = isDark ? colors.textSecondary : (theme?.textSecondary || '#475569');
  const textMuted = isDark ? colors.textMuted : (theme?.textMuted || '#64748B');
  const inputBg = isDark ? '#090D16' : (theme?.bgSubCard || '#F1F5F9');
  const inputBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : (theme?.borderCard || '#CBD5E1');

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleRow}>
              <Server size={18} color={theme?.accentPrimary || colors.cyan} />
              <Text style={[styles.modalTitle, { color: textColor }]}>Configuración del Bróker MQTT</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={textSub} />
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
              <Wifi size={14} color={textSub} />
              <Text style={[styles.sectionTitle, { color: textSub }]}>Dirección y Transporte WebSocket</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Host / Dominio / IP</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={host}
                onChangeText={handleHostChange}
                placeholder="192.168.1.5 o xxxx.ngrok-free.app"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
              />
              {/* Presets rápidos */}
              <View style={styles.quickPresetsRow}>
                <TouchableOpacity
                  style={[styles.quickPresetChip, { borderColor, backgroundColor: inputBg }]}
                  onPress={() => {
                    setHost('192.168.1.5');
                    setPort('8083');
                    setUseSsl(false);
                  }}
                >
                  <Text style={[styles.quickPresetText, { color: theme?.accentPrimary || colors.cyan }]}>
                    IP Local (192.168.1.5:8083)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickPresetChip, { borderColor, backgroundColor: inputBg }]}
                  onPress={() => {
                    setHost('localhost');
                    setPort('8083');
                    setUseSsl(false);
                  }}
                >
                  <Text style={[styles.quickPresetText, { color: textSub }]}>
                    localhost:8083
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Puerto WS</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                  value={port}
                  onChangeText={(val) => {
                    setPort(val);
                    if (val === '443') setUseSsl(true);
                  }}
                  keyboardType="numeric"
                  placeholder="8083 o 443"
                  placeholderTextColor={textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Ruta WS</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                  value={path}
                  onChangeText={setPath}
                  placeholder="/mqtt"
                  placeholderTextColor={textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sslToggleRow,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)', borderColor },
              ]}
              onPress={() => setUseSsl(!useSsl)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, useSsl && { backgroundColor: theme?.accentPrimary || colors.cyan, borderColor: theme?.accentPrimary || colors.cyan }]}>
                {useSsl && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sslToggleLabel, { color: textColor }]}>Cifrado SSL / WSS ({useSsl ? 'wss://' : 'ws://'})</Text>
                <Text style={[styles.sslToggleHelp, { color: textMuted }]}>Actívalo para Ngrok, Cloudflare o puertos 443</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sectionTitleRow}>
              <Shield size={14} color={textSub} />
              <Text style={[styles.sectionTitle, { color: textSub }]}>Mecanismo de Seguridad y Autenticación</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Usuario MQTT</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={username}
                onChangeText={setUsername}
                placeholder="sensor_iot"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Contraseña</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                placeholder="••••••••"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Client ID</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                value={clientId}
                onChangeText={setClientId}
                placeholder="Mobile_Client"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: theme?.accentPrimary || colors.cyan }]}
                onPress={handleApply}
              >
                <Text style={[styles.connectButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Guardar y Conectar</Text>
              </TouchableOpacity>

              {status === 'connected' && (
                <TouchableOpacity style={[styles.disconnectButton, { borderColor }]} onPress={onDisconnect}>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
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
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 12,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quickPresetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickPresetText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  sslToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  sslToggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sslToggleHelp: {
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 10,
    marginBottom: 20,
  },
  connectButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  disconnectButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
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

