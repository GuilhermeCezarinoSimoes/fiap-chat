import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import { uploadGroupPhoto } from './storageService';
import { NOTIFICATION_POLICIES, type ChatGroup, type ChatGroupDocument, type NotificationPolicy } from '../types/group';
import { AppError } from '../utils/errors';
import {
  uniqueIds,
  validateGroupName,
  validateMemberCount,
  validateMemberLimit,
} from '../utils/groupValidation';

const groupsCollection = collection(firestore, 'groups');
const groupDoc = (groupId: string) => doc(firestore, 'groups', groupId);

function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

export function parseGroup(id: string, data: Record<string, unknown>): ChatGroup | null {
  if (typeof data.name !== 'string' || typeof data.ownerId !== 'string' || !Array.isArray(data.memberIds)) {
    return null;
  }
  return {
    id,
    name: data.name,
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    ownerId: data.ownerId,
    memberIds: data.memberIds.filter((item): item is string => typeof item === 'string'),
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : 0,
    notificationPolicy: isNotificationPolicy(data.notificationPolicy) ? data.notificationPolicy : 'all_group_messages',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

function assertValid(result: ReturnType<typeof validateGroupName>): void {
  if (!result.valid) {
    throw new AppError('invalid-group', result.message);
  }
}

// ------------------------------------------------------------------
// Leitura em tempo real
// ------------------------------------------------------------------

export function subscribeMyGroups(
  uid: string,
  onData: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const groupsQuery = query(groupsCollection, where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((item) => parseGroup(item.id, item.data()))
        .filter((item): item is ChatGroup => item !== null);
      onData(groups);
    },
    onError,
  );
}

export function subscribeGroup(
  groupId: string,
  onData: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    groupDoc(groupId),
    (snapshot) => onData(snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

// ------------------------------------------------------------------
// Sincronização com o Realtime Database (via API)
// ------------------------------------------------------------------

/**
 * As regras do RTDB não conseguem consultar o Firestore. A API copia a lista
 * oficial de membros (Firestore) para groupMembers/{groupId} no RTDB, que é a
 * base das regras de leitura/escrita das mensagens do grupo.
 */
export function syncGroupMembers(groupId: string): Promise<{ memberCount: number }> {
  return apiRequest<{ memberCount: number }>(`/groups/${encodeURIComponent(groupId)}/sync-members`, {
    method: 'POST',
  });
}

// ------------------------------------------------------------------
// Escrita
// ------------------------------------------------------------------

export type CreateGroupInput = {
  ownerId: string;
  name: string;
  memberLimit: number;
  memberIds: string[];
  notificationPolicy: NotificationPolicy;
  photoUri: string | null;
};

export type GroupMutationResult = {
  groupId: string;
  /** Avisos não bloqueantes (foto ou sincronização falharam). */
  warnings: string[];
};

export async function createGroup(input: CreateGroupInput): Promise<GroupMutationResult> {
  const memberIds = uniqueIds([input.ownerId, ...input.memberIds]);
  assertValid(validateGroupName(input.name));
  assertValid(validateMemberLimit(input.memberLimit, memberIds.length));
  assertValid(validateMemberCount(memberIds, input.memberLimit));

  const newGroupRef = doc(groupsCollection);
  const now = Date.now();
  const group: ChatGroupDocument = {
    name: input.name.trim(),
    photoUrl: '',
    ownerId: input.ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newGroupRef, group);

  const warnings: string[] = [];
  if (input.photoUri) {
    try {
      const photoUrl = await uploadGroupPhoto(newGroupRef.id, input.photoUri);
      await updateGroupPhotoUrl(newGroupRef.id, photoUrl);
    } catch {
      warnings.push('O grupo foi criado, mas a foto não pôde ser enviada.');
    }
  }
  try {
    await syncGroupMembers(newGroupRef.id);
  } catch {
    warnings.push('O grupo foi criado, mas a sincronização das permissões falhou. Abra o grupo para tentar novamente.');
  }
  return { groupId: newGroupRef.id, warnings };
}

async function updateGroupPhotoUrl(groupId: string, photoUrl: string): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupDoc(groupId));
    if (!snapshot.exists()) {
      throw new AppError('group-not-found', 'Grupo não encontrado.');
    }
    transaction.update(groupDoc(groupId), { photoUrl, updatedAt: Date.now() });
  });
}

export type UpdateGroupInput = {
  groupId: string;
  requesterId: string;
  name: string;
  memberLimit: number;
  /** Lista desejada de membros (inclui o proprietário). */
  memberIds: string[];
  notificationPolicy: NotificationPolicy;
  photoUri: string | null;
};

/**
 * Atualiza o grupo dentro de uma transação. A validação do limite é feita
 * sobre o documento lido NA transação; se outro cliente alterar o grupo ao
 * mesmo tempo, o Firestore aborta e reexecuta a transação com os dados novos.
 * As regras de segurança repetem a validação no servidor.
 */
export async function updateGroup(input: UpdateGroupInput): Promise<GroupMutationResult> {
  assertValid(validateGroupName(input.name));

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupDoc(input.groupId));
    const current = snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
    if (!current) {
      throw new AppError('group-not-found', 'Grupo não encontrado.');
    }
    if (current.ownerId !== input.requesterId) {
      throw new AppError('not-owner', 'Somente o proprietário pode alterar o grupo.');
    }

    const memberIds = uniqueIds([current.ownerId, ...input.memberIds]);
    const added = memberIds.filter((id) => !current.memberIds.includes(id));
    if (added.length > 0 && current.memberIds.length >= input.memberLimit) {
      throw new AppError('group-full', 'O grupo atingiu o limite de integrantes. Nenhum novo membro pode ser adicionado.');
    }
    assertValid(validateMemberLimit(input.memberLimit, memberIds.length));
    assertValid(validateMemberCount(memberIds, input.memberLimit));

    transaction.update(groupDoc(input.groupId), {
      name: input.name.trim(),
      memberIds,
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    });
  });

  const warnings: string[] = [];
  if (input.photoUri) {
    try {
      const photoUrl = await uploadGroupPhoto(input.groupId, input.photoUri);
      await updateGroupPhotoUrl(input.groupId, photoUrl);
    } catch {
      warnings.push('As alterações foram salvas, mas a nova foto não pôde ser enviada.');
    }
  }
  try {
    await syncGroupMembers(input.groupId);
  } catch {
    warnings.push('As alterações foram salvas, mas a sincronização das permissões falhou. Tente salvar novamente.');
  }
  return { groupId: input.groupId, warnings };
}

export async function removeMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupDoc(groupId));
    const current = snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
    if (!current) {
      throw new AppError('group-not-found', 'Grupo não encontrado.');
    }
    if (current.ownerId !== requesterId) {
      throw new AppError('not-owner', 'Somente o proprietário pode remover integrantes.');
    }
    if (memberId === current.ownerId) {
      throw new AppError('remove-owner', 'O proprietário não pode ser removido do grupo.');
    }
    const memberIds = current.memberIds.filter((id) => id !== memberId);
    assertValid(validateMemberCount(memberIds, current.memberLimit));
    transaction.update(groupDoc(groupId), { memberIds, updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}
