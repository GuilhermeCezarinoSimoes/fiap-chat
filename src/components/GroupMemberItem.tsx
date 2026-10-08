import { Ionicons } from '@expo/vector-icons';
import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors, spacing } from '../theme/colors';

type Props = {
  name: string;
  photoUrl: string;
  subtitle?: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Ação à direita (ex.: botão de remover). */
  accessory?: ReactNode;
};

/** Linha de usuário reutilizada em listas de usuários e de membros do grupo. */
function GroupMemberItemComponent({ name, photoUrl, subtitle, onPress, selected, disabled = false, accessory }: Props) {
  const selectable = selected !== undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected, disabled } : { disabled }}
      accessibilityLabel={name}
    >
      <Avatar uri={photoUrl} size={44} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {selectable ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={selected ? colors.primary : colors.placeholder}
        />
      ) : null}
      {accessory}
    </Pressable>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.45 },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
