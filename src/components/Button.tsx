import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary' }: Props) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.surface : colors.primary} />
      ) : (
        <Text style={[styles.text, !isPrimary && styles.textAlt, variant === 'danger' && styles.textDanger]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  dimmed: { opacity: 0.6 },
  text: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  textAlt: { color: colors.primary },
  textDanger: { color: colors.danger },
});
