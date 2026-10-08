import { FieldValue } from 'firebase-admin/firestore';
import { adminDatabase, adminFirestore } from './firebaseAdmin.js';
import {
  NOTIFICATION_POLICIES,
  type ChatUserProfile,
  type ConversationContext,
  type DeviceToken,
  type GroupData,
  type MessageTarget,
  type NotificationPolicy,
  type StoredMessage,
} from '../types.js';

const DIRECT_PREFIX = 'direct_';

export const isDirectConversationId = (conversationId: string): boolean => conversationId.startsWith(DIRECT_PREFIX);

/** Aceita apenas ids seguros como chave do RTDB/Firestore. */
export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  const record = asRecord(value);
  return record ? Object.values(record).filter((item): item is string => typeof item === 'string') : [];
}

function parseTarget(value: unknown): MessageTarget {
  const record = asRecord(value);
  if (record?.type === 'member' && typeof record.memberId === 'string') {
    return { type: 'member', memberId: record.memberId };
  }
  return { type: 'conversation' };
}

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

// ------------------------------------------------------------------
// Mensagens (Realtime Database)
// ------------------------------------------------------------------

export async function loadMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await adminDatabase().ref(`messages/${conversationId}/${messageId}`).get();
  const data = asRecord(snapshot.val());
  if (!data) return null;
  if (
    typeof data.senderId !== 'string' ||
    typeof data.text !== 'string' ||
    (data.conversationType !== 'direct' && data.conversationType !== 'group')
  ) {
    return null;
  }
  return {
    id: messageId,
    conversationId,
    conversationType: data.conversationType,
    senderId: data.senderId,
    text: data.text,
    target: parseTarget(data.target),
    mentionedUserIds: asStringList(data.mentionedUserIds),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

// ------------------------------------------------------------------
// Conversas e grupos (Firestore)
// ------------------------------------------------------------------

export async function loadGroup(groupId: string): Promise<GroupData | null> {
  const snapshot = await adminFirestore().collection('groups').doc(groupId).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || typeof data.name !== 'string' || typeof data.ownerId !== 'string') {
    return null;
  }
  return {
    id: snapshot.id,
    name: data.name,
    ownerId: data.ownerId,
    memberIds: asStringList(data.memberIds),
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : 0,
    notificationPolicy: isPolicy(data.notificationPolicy) ? data.notificationPolicy : 'all_group_messages',
  };
}

export async function loadConversation(conversationId: string): Promise<ConversationContext | null> {
  if (isDirectConversationId(conversationId)) {
    const snapshot = await adminFirestore().collection('directConversations').doc(conversationId).get();
    const participants = asStringList(snapshot.data()?.participantIds);
    if (!snapshot.exists || participants.length !== 2) return null;
    return { type: 'direct', conversation: { id: conversationId, participantIds: [participants[0], participants[1]] } };
  }
  const group = await loadGroup(conversationId);
  return group ? { type: 'group', group } : null;
}

/**
 * Replica a lista oficial de membros (Firestore) em groupMembers/{groupId} no
 * RTDB. As regras do RTDB usam esse nó para liberar leitura/escrita das
 * mensagens; um membro removido perde o acesso assim que o nó é regravado.
 */
export async function syncGroupMembersMirror(groupId: string, memberIds: string[] | null): Promise<void> {
  const ref = adminDatabase().ref(`groupMembers/${groupId}`);
  if (!memberIds || memberIds.length === 0) {
    await ref.remove();
    return;
  }
  await ref.set(Object.fromEntries(memberIds.map((uid) => [uid, true])));
}

// ------------------------------------------------------------------
// Usuários e dispositivos
// ------------------------------------------------------------------

export async function loadDisplayName(uid: string): Promise<string> {
  const snapshot = await adminFirestore().collection('userDirectory').doc(uid).get();
  const name = snapshot.data()?.name;
  return typeof name === 'string' && name.length > 0 ? name : 'Alguém';
}

export async function loadProfile(uid: string): Promise<ChatUserProfile | null> {
  const snapshot = await adminFirestore().collection('users').doc(uid).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) return null;
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  return {
    uid,
    name: text(data.name),
    email: text(data.email),
    phoneNumber: text(data.phoneNumber),
    birthDate: text(data.birthDate),
    photoUrl: text(data.photoUrl),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

/** Verifica se dois usuários compartilham conversa individual ou grupo. */
export async function shareConversation(requesterId: string, targetId: string): Promise<boolean> {
  const [first, second] = requesterId < targetId ? [requesterId, targetId] : [targetId, requesterId];
  const directSnapshot = await adminFirestore()
    .collection('directConversations')
    .doc(`${DIRECT_PREFIX}${first}_${second}`)
    .get();
  if (directSnapshot.exists) return true;

  const groups = await adminFirestore().collection('groups').where('memberIds', 'array-contains', requesterId).get();
  return groups.docs.some((doc) => asStringList(doc.data().memberIds).includes(targetId));
}

/** Tokens ativos dos destinatários (somente dispositivos com notificações habilitadas). */
export async function loadDeviceTokens(uids: string[]): Promise<DeviceToken[]> {
  const perUser = await Promise.all(
    uids.map(async (uid) => {
      const snapshot = await adminFirestore()
        .collection('users')
        .doc(uid)
        .collection('devices')
        .where('enabled', '==', true)
        .get();
      return snapshot.docs.flatMap((doc) => {
        const token = doc.data().token;
        return typeof token === 'string' && token.length > 0 ? [{ uid, deviceId: doc.id, token }] : [];
      });
    }),
  );
  return perUser.flat();
}

/** Desativa tokens inválidos informados pelo serviço de push. */
export async function disableDevices(devices: DeviceToken[], reason: string): Promise<void> {
  if (devices.length === 0) return;
  const batch = adminFirestore().batch();
  for (const device of devices) {
    batch.update(adminFirestore().collection('users').doc(device.uid).collection('devices').doc(device.deviceId), {
      enabled: false,
      invalidReason: reason,
      invalidatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
