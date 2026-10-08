import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type Props = { message?: string };

export function Loading({ message = 'Carregando...' }: Props) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  text: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
});
