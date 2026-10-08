export type ConversationType = 'direct' | 'group';

export type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type GroupData = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type DirectConversationData = {
  id: string;
  participantIds: [string, string];
};

export type ConversationContext =
  | { type: 'direct'; conversation: DirectConversationData }
  | { type: 'group'; group: GroupData };

export type ChatUserProfile = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type DeviceToken = {
  uid: string;
  deviceId: string;
  token: string;
};
