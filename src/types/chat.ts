import type { ChatGroup } from './group';

export type ConversationType = 'direct' | 'group';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/**
 * Formato gravado no Realtime Database: messages/{conversationId}/{messageId}.
 * createdAt é gravado com ServerValue.TIMESTAMP e lido como número.
 */
export type MessageRecord = Omit<ChatMessage, 'id' | 'createdAt'> & {
  createdAt: number | object;
};

export type NewMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

/** Documento Firestore directConversations/{conversationId}. */
export type DirectConversation = {
  id: string;
  type: 'direct';
  participantIds: [string, string];
  createdAt: number;
};

export type ConversationSummary =
  | { kind: 'direct'; conversation: DirectConversation; otherUserId: string; sortKey: number }
  | { kind: 'group'; group: ChatGroup; sortKey: number };
