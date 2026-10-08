import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GroupMemberItem } from './GroupMemberItem';
import type { SendMessageArgs } from '../hooks/useChat';
import { MAX_MESSAGE_LENGTH } from '../services/chatService';
import type { MessageTarget } from '../types/chat';
import type { UserDirectoryEntry } from '../types/user';
import { colors, spacing } from '../theme/colors';

type Props = {
  onSend: (args: SendMessageArgs) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
  /** Membros que podem ser mencionados (somente em grupos, sem o próprio usuário). */
  mentionableMembers?: UserDirectoryEntry[];
};

export function ChatInput({ onSend, sending, disabled = false, mentionableMembers }: Props) {
  const [text, setText] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canMention = mentionableMembers !== undefined && mentionableMembers.length > 0;
  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending && !disabled;

  const selectedMembers = useMemo(
    () => (mentionableMembers ?? []).filter((member) => mentionIds.includes(member.uid)),
    [mentionableMembers, mentionIds],
  );

  const toggleMention = useCallback((uid: string) => {
    setMentionIds((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]));
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    // Um único membro selecionado vira destinatário explícito; vários viram menções.
    const target: MessageTarget =
      mentionIds.length === 1 ? { type: 'member', memberId: mentionIds[0] } : { type: 'conversation' };
    const sent = await onSend({ text: trimmed, target, mentionedUserIds: mentionIds });
    if (sent) {
      setText('');
      setMentionIds([]);
    }
  }, [canSend, mentionIds, onSend, trimmed]);

  return (
    <View style={styles.wrapper}>
      {selectedMembers.length > 0 ? (
        <View style={styles.chips}>
          {selectedMembers.map((member) => (
            <Pressable
              key={member.uid}
              style={styles.chip}
              onPress={() => toggleMention(member.uid)}
              accessibilityLabel={`Remover menção a ${member.name}`}
            >
              <Text style={styles.chipText}>@{member.name}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.container}>
        {canMention ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Mencionar integrante"
            disabled={disabled}
          >
            <Ionicons name="at" size={24} color={colors.primary} />
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Envio indisponível' : 'Digite uma mensagem'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!disabled}
          accessibilityLabel="Campo de mensagem"
        />
        <Pressable
          onPress={() => void handleSend()}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Ionicons name={sending ? 'hourglass' : 'send'} size={20} color={colors.surface} />
        </Pressable>
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mencionar / direcionar para</Text>
            <Text style={styles.modalHint}>
              Selecione um integrante para direcionar a mensagem, ou vários para mencioná-los.
            </Text>
            <FlatList
              data={mentionableMembers ?? []}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <GroupMemberItem
                  name={item.name}
                  photoUrl={item.photoUrl}
                  selected={mentionIds.includes(item.uid)}
                  onPress={() => toggleMention(item.uid)}
                />
              )}
              style={styles.modalList}
            />
            <Pressable style={styles.modalClose} onPress={() => setPickerOpen(false)} accessibilityRole="button">
              <Text style={styles.modalCloseText}>Concluir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  iconButton: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.lg,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    color: colors.text,
  },
  modalHint: {
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  modalList: { flexGrow: 0 },
  modalClose: {
    margin: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCloseText: { color: colors.surface, fontWeight: '700' },
});
