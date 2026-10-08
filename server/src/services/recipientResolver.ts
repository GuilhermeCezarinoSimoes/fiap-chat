import type { ConversationContext, StoredMessage } from '../types.js';

/**
 * Calcula, no servidor, quem pode receber o push de uma mensagem.
 * Nunca usa listas de destinatários enviadas pelo app.
 *
 * Regras comuns a todas as políticas:
 *  - o remetente nunca recebe o push da própria mensagem;
 *  - apenas participantes atuais da conversa podem receber.
 */
export function resolveRecipients(context: ConversationContext, message: StoredMessage): string[] {
  const participants = context.type === 'direct' ? context.conversation.participantIds : context.group.memberIds;
  const isParticipant = (uid: string) => participants.includes(uid);
  const notSender = (uid: string) => uid !== message.senderId;

  if (context.type === 'direct') {
    // Conversas individuais sempre notificam o outro participante.
    return participants.filter(notSender);
  }

  switch (context.group.notificationPolicy) {
    case 'all_group_messages':
      return participants.filter(notSender);

    case 'mentioned_members': {
      const explicitTarget = message.target.type === 'member' ? [message.target.memberId] : [];
      const candidates = new Set([...explicitTarget, ...message.mentionedUserIds]);
      return [...candidates].filter((uid) => isParticipant(uid) && notSender(uid));
    }

    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}

/** Indica se o destinatário foi mencionado/selecionado (personaliza o texto do push). */
export function isMentioned(message: StoredMessage, uid: string): boolean {
  return (message.target.type === 'member' && message.target.memberId === uid) || message.mentionedUserIds.includes(uid);
}
