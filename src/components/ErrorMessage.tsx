import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type Props = {
  message: string | null | undefined;
  tone?: 'error' | 'warning';
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function ErrorMessage({ message, tone = 'error', onRetry, onDismiss }: Props) {
  if (!message) {
    return null;
  }
  const isWarning = tone === 'warning';
  return (
    <View
      style={[styles.container, isWarning ? styles.warning : styles.error]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={[styles.text, { color: isWarning ? colors.warning : colors.danger }]}>{message}</Text>
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
            <Text style={styles.action}>Tentar novamente</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button">
            <Text style={styles.action}>Fechar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  error: { backgroundColor: colors.dangerBackground },
  warning: { backgroundColor: colors.warningBackground },
  text: { fontSize: 14 },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  action: {
    marginTop: spacing.xs,
    fontWeight: '600',
    color: colors.text,
  },
});
