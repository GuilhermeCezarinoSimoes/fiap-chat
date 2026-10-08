import type { ConversationType } from './chat';

/** Documento Firestore users/{uid}/devices/{deviceId}. */
export type DeviceRegistration = {
  token: string;
  provider: 'expo';
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};

/** Dados obrigatórios do payload de toda notificação enviada pela API. */
export type PushPayloadData = {
  conversationId: string;
  conversationType: ConversationType;
};

export type NotificationRegistrationStatus =
  | { state: 'idle' }
  | { state: 'registering' }
  | { state: 'registered'; deviceId: string }
  | { state: 'permission-denied' }
  | { state: 'unsupported-device' }
  | { state: 'disabled' }
  | { state: 'error'; message: string };

export type NotifyMessageResponse = {
  status: 'sent' | 'duplicate' | 'no_recipients';
  recipients: number;
};
