import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore';
import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
  type DataSnapshot,
} from 'firebase/database';
import { apiRequest } from './apiClient';
import { firestore, realtimeDb } from './firebase';
import type { ChatMessage, DirectConversation, MessageRecord, MessageTarget, NewMessageInput } from '../types/chat';
import type { NotifyMessageResponse } from '../types/notification';
import { buildDirectConversationId, sortParticipants } from '../utils/conversationId';
import { AppError } from '../utils/errors';

export const MESSAGE_PAGE_SIZE = 200;
export const MAX_MESSAGE_LENGTH = 2000;

// ------------------------------------------------------------------
// Conversas individuais (metadados no Firestore)
// ------------------------------------------------------------------

function parseDirectConversation(id: string, data: Record<string, unknown>): DirectConversation | null {
  const participants = data.participantIds;
  if (!Array.isArray(participants) || participants.length !== 2) {
    return null;
  }
  const [first, second] = participants;
  if (typeof first !== 'string' || typeof second !== 'string') {
    return null;
  }
  return {
    id,
    type: 'direct',
    participantIds: [first, second],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

/**
 * Cria ou localiza a conversa individual. O id determinístico garante que
 * exista apenas uma conversa por par de usuários, mesmo com cliques simultâneos.
 */
export async function getOrCreateDirectConversation(currentUid: string, otherUid: string): Promise<string> {
  if (currentUid === otherUid) {
    throw new AppError('self-conversation', 'Você não pode iniciar uma conversa consigo mesmo.');
  }
  const conversationId = buildDirectConversationId(currentUid, otherUid);
  const conversationRef = doc(firestore, 'directConversations', conversationId);

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (snapshot.exists()) {
      return;
    }
    const conversation: DirectConversation = {
      id: conversationId,
      type: 'direct',
      participantIds: sortParticipants(currentUid, otherUid),
      createdAt: Date.now(),
    };
    transaction.set(conversationRef, conversation);
  });

  return conversationId;
}

export function subscribeDirectConversations(
  uid: string,
  onData: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): FirestoreUnsubscribe {
  const conversationsQuery = query(
    collection(firestore, 'directConversations'),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((item) => parseDirectConversation(item.id, item.data()))
        .filter((item): item is DirectConversation => item !== null);
      onData(conversations);
    },
    onError,
  );
}

// ------------------------------------------------------------------
// Mensagens (Realtime Database)
// ------------------------------------------------------------------

function parseTarget(value: unknown): MessageTarget {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    const candidate = value as { type: unknown; memberId?: unknown };
    if (candidate.type === 'member' && typeof candidate.memberId === 'string') {
      return { type: 'member', memberId: candidate.memberId };
    }
  }
  return { type: 'conversation' };
}

function parseStringList(value: unknown): string[] {
  // O RTDB não guarda arrays vazios e pode devolver arrays como objetos indexados.
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function parseMessage(snapshot: DataSnapshot): ChatMessage | null {
  const value: unknown = snapshot.val();
  if (typeof value !== 'object' || value === null || snapshot.key === null) {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (
    typeof data.conversationId !== 'string' ||
    typeof data.senderId !== 'string' ||
    typeof data.text !== 'string' ||
    (data.conversationType !== 'direct' && data.conversationType !== 'group')
  ) {
    return null;
  }
  return {
    id: snapshot.key,
    conversationId: data.conversationId,
    conversationType: data.conversationType,
    senderId: data.senderId,
    text: data.text,
    target: parseTarget(data.target),
    mentionedUserIds: parseStringList(data.mentionedUserIds),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

/**
 * Listener em tempo real das mensagens de uma conversa.
 * Retorna a função que remove o listener (usada no cleanup do useEffect).
 */
export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = rtdbQuery(
    ref(realtimeDb, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE_SIZE),
  );
  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const message = parseMessage(child);
        if (message) {
          messages.push(message);
        }
      });
      onData(messages);
    },
    onError,
  );
}

/** Persiste a mensagem no Realtime Database e devolve o id gerado. */
export async function sendMessage(senderId: string, input: NewMessageInput): Promise<string> {
  const text = input.text.trim();
  if (text.length === 0) {
    throw new AppError('empty-message', 'Digite uma mensagem antes de enviar.');
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('long-message', `A mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const messageRef = push(ref(realtimeDb, `messages/${input.conversationId}`));
  if (messageRef.key === null) {
    throw new AppError('message-id', 'Não foi possível gerar o identificador da mensagem.');
  }

  const record: MessageRecord = {
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId,
    text,
    target: input.target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt: serverTimestamp(),
  };
  await set(messageRef, record);
  return messageRef.key;
}

/**
 * Solicita à API online o envio do push. A API recalcula os destinatários
 * no servidor; o app envia somente os identificadores.
 */
export function requestMessageNotification(conversationId: string, messageId: string): Promise<NotifyMessageResponse> {
  return apiRequest<NotifyMessageResponse>('/notifications/messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, messageId }),
  });
}
