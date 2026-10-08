import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionStatus } from '../hooks/useConnectionStatus';
import { colors, spacing } from '../theme/colors';

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Conectando...',
  online: 'Online',
  offline: 'Sem conexão — as mensagens serão sincronizadas quando a internet voltar.',
};

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const isOnline = status === 'online';
  return (
    <View style={[styles.container, isOnline ? styles.online : styles.offline]} accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  online: { backgroundColor: '#E9F6EC' },
  offline: { backgroundColor: colors.warningBackground },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  text: {
    fontSize: 12,
    color: colors.text,
    flexShrink: 1,
  },
});
