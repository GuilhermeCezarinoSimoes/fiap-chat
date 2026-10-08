import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage as ChatMessageType } from '../types/chat';
import { colors, spacing } from '../theme/colors';
import { formatTime } from '../utils/formValidation';

type Props = {
  message: ChatMessageType;
  isOwn: boolean;
  /** Nome do autor (exibido apenas em grupos). */
  authorName: string | null;
  /** Nomes dos membros mencionados/destinatários. */
  mentionNames: string[];
};

function ChatMessageComponent({ message, isOwn, authorName, mentionNames }: Props) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {authorName && !isOwn ? <Text style={styles.author}>{authorName}</Text> : null}
        {mentionNames.length > 0 ? (
          <Text style={[styles.mentions, isOwn && styles.mentionsOwn]}>
            {message.target.type === 'member' ? 'Para ' : ''}
            {mentionNames.map((name) => `@${name}`).join(' ')}
          </Text>
        ) : null}
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    marginVertical: 3,
    flexDirection: 'row',
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.sent,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.received,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  author: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.groupBadge,
    marginBottom: 2,
  },
  mentions: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  mentionsOwn: { color: '#FFE0EA' },
  text: {
    fontSize: 15,
    color: colors.text,
  },
  textOwn: { color: colors.surface },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeOwn: { color: '#FFE0EA' },
});
