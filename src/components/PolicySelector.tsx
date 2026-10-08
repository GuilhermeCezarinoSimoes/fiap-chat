import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/group';
import { colors, spacing } from '../theme/colors';

export const POLICY_LABELS: Record<NotificationPolicy, { title: string; description: string }> = {
  all_group_messages: {
    title: 'Todas as mensagens',
    description: 'Todos os membros, exceto quem enviou, recebem push de cada mensagem do grupo.',
  },
  mentioned_members: {
    title: 'Somente mencionados',
    description: 'Apenas os membros mencionados ou escolhidos como destinatários recebem push.',
  },
  direct_messages_only: {
    title: 'Somente conversas individuais',
    description: 'Mensagens deste grupo não geram push; apenas conversas individuais notificam.',
  },
  disabled: {
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera notificação push.',
  },
};

type Props = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: Props) {
  return (
    <View accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const selected = policy === value;
        return (
          <Pressable
            key={policy}
            onPress={() => onChange(policy)}
            disabled={disabled}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
            <View style={styles.texts}>
              <Text style={styles.title}>{POLICY_LABELS[policy].title}</Text>
              <Text style={styles.description}>{POLICY_LABELS[policy].description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary },
  texts: { flex: 1 },
  title: { fontWeight: '600', color: colors.text },
  description: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
