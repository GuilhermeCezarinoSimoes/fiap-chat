import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { uploadProfilePhoto } from './storageService';
import { saveUserProfile } from './userService';
import type { ChatUser, LoginInput, RegisterInput } from '../types/user';
import { AppError, getErrorMessage } from '../utils/errors';
import { onlyDigits, parseBirthDate } from '../utils/formValidation';

export const REGISTRATION_INCOMPLETE = 'registration-incomplete';

export type RegisterResult = {
  user: ChatUser;
  /** true quando a conta foi criada mas a foto não pôde ser enviada. */
  photoUploadFailed: boolean;
};

/**
 * Cadastro exclusivamente por e-mail e senha.
 * Fluxo: cria a conta no Auth → envia a foto ao Storage → grava o perfil no Firestore.
 * Se o perfil não puder ser gravado, a conta recém-criada é removida para não
 * deixar um usuário sem cadastro.
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const birthDate = parseBirthDate(input.birthDate);
  if (birthDate === null) {
    throw new AppError('invalid-birth-date', 'Informe uma data de nascimento válida.');
  }

  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const firebaseUser = credential.user;

  let photoUrl = '';
  let photoUploadFailed = false;
  if (input.photoUri) {
    try {
      photoUrl = await uploadProfilePhoto(input.photoUri);
    } catch {
      photoUploadFailed = true;
    }
  }

  const profile: ChatUser = {
    uid: firebaseUser.uid,
    name: input.name.trim(),
    email: firebaseUser.email ?? input.email.trim(),
    phoneNumber: onlyDigits(input.phoneNumber),
    birthDate,
    photoUrl,
    createdAt: Date.now(),
  };

  try {
    await saveUserProfile(profile);
  } catch (error: unknown) {
    await deleteUser(firebaseUser).catch(() => undefined);
    throw new AppError(
      REGISTRATION_INCOMPLETE,
      `Não foi possível concluir o cadastro. ${getErrorMessage(error, 'Tente novamente.')}`,
    );
  }

  return { user: profile, photoUploadFailed };
}

export async function login({ email, password }: LoginInput): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export function logout(): Promise<void> {
  return signOut(auth);
}

/** Observa a sessão persistida; é chamado imediatamente com o estado recuperado. */
export function observeSession(listener: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, listener);
}
