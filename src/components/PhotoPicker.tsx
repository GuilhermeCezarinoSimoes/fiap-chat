import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors, spacing } from '../theme/colors';

type Props = {
  uri: string | null;
  onPress: () => void;
  label: string;
  variant?: 'user' | 'group';
  error?: string | null;
  disabled?: boolean;
};

export function PhotoPicker({ uri, onPress, label, variant = 'user', error, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
        <Avatar uri={uri} size={96} variant={variant} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
  },
});
