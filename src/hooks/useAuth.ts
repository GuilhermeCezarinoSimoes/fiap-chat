import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

/** Para telas autenticadas: garante uid e perfil carregados. */
export function useCurrentUser() {
  const { firebaseUser, profile } = useAuth();
  if (!firebaseUser) {
    throw new Error('useCurrentUser exige um usuário autenticado');
  }
  return { uid: firebaseUser.uid, profile };
}
