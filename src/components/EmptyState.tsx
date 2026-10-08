import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.placeholder} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
