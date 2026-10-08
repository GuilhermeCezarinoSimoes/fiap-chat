export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

/** Documento Firestore groups/{groupId} (sem o id). */
export type ChatGroupDocument = {
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type ChatGroup = ChatGroupDocument & {
  id: string;
};

export type GroupFormValues = {
  name: string;
  memberLimit: string;
  memberIds: string[];
  notificationPolicy: NotificationPolicy;
  /** URI local de uma nova foto escolhida; null mantém a atual. */
  newPhotoUri: string | null;
};
