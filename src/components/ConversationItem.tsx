import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors, spacing } from '../theme/colors';

type Props = {
  title: string;
  subtitle: string;
  photoUrl: string;
  type: 'direct' | 'group';
  onPress: () => void;
};

function ConversationItemComponent({ title, subtitle, photoUrl, type, onPress }: Props) {
  const isGroup = type === 'group';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa individual'} ${title}`}
    >
      <Avatar uri={photoUrl} variant={isGroup ? 'group' : 'user'} size={50} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isGroup ? colors.groupBadge : colors.directBadge }]}>
        <Ionicons name={isGroup ? 'people' : 'person'} size={12} color={colors.surface} />
        <Text style={styles.badgeText}>{isGroup ? 'Grupo' : 'Individual'}</Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
});
