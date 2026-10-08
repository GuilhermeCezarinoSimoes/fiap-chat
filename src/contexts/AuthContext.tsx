import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';
import { unregisterDevice } from '../services/notificationService';
import { subscribeOwnProfile } from '../services/userService';
import type { ChatUser, LoginInput, RegisterInput } from '../types/user';
import { AppError, getErrorMessage } from '../utils/errors';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'signing-out';

export type AuthContextValue = {
  status: AuthStatus;
  firebaseUser: User | null;
  /** Perfil completo do usuário logado (Firestore). */
  profile: ChatUser | null;
  profileLoading: boolean;
  profileError: string | null;
  isRegistering: boolean;
  /** Aviso exibido na tela de login (ex.: sessão expirada). */
  notice: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<authService.RegisterResult>;
  logout: () => Promise<void>;
  expireSession: () => void;
  clearNotice: () => void;
};

type ProfileState = { uid: string; profile: ChatUser | null; error: string | null };

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Recupera a sessão persistida e acompanha login/logout.
  useEffect(() => {
    const unsubscribe = authService.observeSession((user) => {
      setFirebaseUser(user);
      setSessionResolved(true);
    });
    return unsubscribe;
  }, []);

  const uid = firebaseUser?.uid ?? null;

  // Perfil em tempo real; o listener é removido no logout ou troca de usuário.
  useEffect(() => {
    if (!uid) {
      setProfileState(null);
      return undefined;
    }
    const unsubscribe = subscribeOwnProfile(
      uid,
      (data) => setProfileState({ uid, profile: data, error: null }),
      (error) => setProfileState({ uid, profile: null, error: getErrorMessage(error, 'Não foi possível carregar seu perfil.') }),
    );
    return unsubscribe;
  }, [uid]);

  // O perfil só é considerado carregado quando pertence ao usuário atual.
  const profileLoaded = uid !== null && profileState?.uid === uid;
  const profile = profileLoaded ? profileState.profile : null;
  const profileError = profileLoaded ? profileState.error : null;
  const profileLoading = uid !== null && !profileLoaded;

  const login = useCallback(async (input: LoginInput) => {
    setNotice(null);
    await authService.login(input);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setNotice(null);
    setIsRegistering(true);
    try {
      return await authService.register(input);
    } catch (error: unknown) {
      // A conta criada foi desfeita e a tela de cadastro foi desmontada: mostra o motivo no login.
      if (error instanceof AppError && error.code === authService.REGISTRATION_INCOMPLETE) {
        setNotice(error.message);
      }
      throw error;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const currentUid = uid;
    // Primeiro desmonta as telas protegidas (removendo todos os listeners),
    // depois remove o token do dispositivo e encerra a sessão.
    setIsSigningOut(true);
    try {
      if (currentUid) {
        await unregisterDevice(currentUid).catch(() => undefined);
      }
      await authService.logout();
    } finally {
      setIsSigningOut(false);
    }
  }, [uid]);

  const expireSession = useCallback(() => {
    setNotice('Sua sessão expirou. Faça login novamente.');
    void logout();
  }, [logout]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const status: AuthStatus = useMemo(() => {
    if (!sessionResolved) return 'loading';
    if (isSigningOut) return 'signing-out';
    return firebaseUser ? 'authenticated' : 'unauthenticated';
  }, [sessionResolved, isSigningOut, firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      firebaseUser,
      profile,
      profileLoading,
      profileError,
      isRegistering,
      notice,
      login,
      register,
      logout,
      expireSession,
      clearNotice,
    }),
    [status, firebaseUser, profile, profileLoading, profileError, isRegistering, notice, login, register, logout, expireSession, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
