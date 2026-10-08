const DIRECT_PREFIX = 'direct_';

/** Gera o id determinístico da conversa individual a partir dos dois uids ordenados. */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('SELF_CONVERSATION');
  }
  const [first, second] = sortParticipants(uidA, uidB);
  return `${DIRECT_PREFIX}${first}_${second}`;
}

export function sortParticipants(uidA: string, uidB: string): [string, string] {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.startsWith(DIRECT_PREFIX);
}

/** Retorna o uid do outro participante de uma conversa individual. */
export function getOtherParticipantId(conversationId: string, currentUid: string): string | null {
  if (!isDirectConversationId(conversationId)) {
    return null;
  }
  const participants = conversationId.slice(DIRECT_PREFIX.length).split('_');
  if (participants.length !== 2 || !participants.includes(currentUid)) {
    return null;
  }
  return participants[0] === currentUid ? participants[1] : participants[0];
}
