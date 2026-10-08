import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import type { ChatUser, UserDirectoryEntry } from '../types/user';

const userConverter: FirestoreDataConverter<ChatUser> = {
  toFirestore: (user: ChatUser): DocumentData => ({ ...user }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): ChatUser => {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      name: typeof data.name === 'string' ? data.name : '',
      email: typeof data.email === 'string' ? data.email : '',
      phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
      birthDate: typeof data.birthDate === 'string' ? data.birthDate : '',
      photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    };
  },
};

const directoryConverter: FirestoreDataConverter<UserDirectoryEntry> = {
  toFirestore: (entry: UserDirectoryEntry): DocumentData => ({ ...entry }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): UserDirectoryEntry => {
    const data = snapshot.data();
    const name = typeof data.name === 'string' ? data.name : '';
    return {
      uid: snapshot.id,
      name,
      nameLower: typeof data.nameLower === 'string' ? data.nameLower : name.toLowerCase(),
      photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    };
  },
};

const userDoc = (uid: string) => doc(firestore, 'users', uid).withConverter(userConverter);
const directoryDoc = (uid: string) => doc(firestore, 'userDirectory', uid).withConverter(directoryConverter);

function toDirectoryEntry(user: ChatUser): UserDirectoryEntry {
  return {
    uid: user.uid,
    name: user.name,
    nameLower: user.name.toLowerCase(),
    photoUrl: user.photoUrl,
    updatedAt: Date.now(),
  };
}

/** Grava o perfil completo (privado) e a entrada pública do diretório numa única operação atômica. */
export async function saveUserProfile(user: ChatUser): Promise<void> {
  const batch = writeBatch(firestore);
  batch.set(userDoc(user.uid), user);
  batch.set(directoryDoc(user.uid), toDirectoryEntry(user));
  await batch.commit();
}

export async function updateProfilePhotoUrl(user: ChatUser, photoUrl: string): Promise<ChatUser> {
  const updated: ChatUser = { ...user, photoUrl };
  await saveUserProfile(updated);
  return updated;
}

export function subscribeOwnProfile(
  uid: string,
  onData: (user: ChatUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => onData(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

/**
 * Perfil de outro usuário: obtido pela API, que só responde se houver
 * conversa individual ou grupo em comum (regra que envolve Firestore + RTDB).
 */
export async function fetchSharedProfile(uid: string): Promise<ChatUser> {
  const response = await apiRequest<{ user: ChatUser }>(`/users/${encodeURIComponent(uid)}/profile`);
  return response.user;
}

const DIRECTORY_LIMIT = 300;

export function subscribeUserDirectory(
  onData: (users: UserDirectoryEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const directoryQuery = query(
    collection(firestore, 'userDirectory').withConverter(directoryConverter),
    orderBy('nameLower'),
    limit(DIRECTORY_LIMIT),
  );
  return onSnapshot(
    directoryQuery,
    (snapshot) => onData(snapshot.docs.map((item) => item.data())),
    onError,
  );
}
