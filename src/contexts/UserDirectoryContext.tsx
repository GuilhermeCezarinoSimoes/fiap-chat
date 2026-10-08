import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeUserDirectory } from '../services/userService';
import type { UserDirectoryEntry } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export type UserDirectoryContextValue = {
  users: UserDirectoryEntry[];
  usersById: ReadonlyMap<string, UserDirectoryEntry>;
  loading: boolean;
  error: string | null;
};

export const UserDirectoryContext = createContext<UserDirectoryContextValue | null>(null);

/**
 * Um único listener do diretório público (nome e foto) compartilhado por todas
 * as telas autenticadas. É removido quando o usuário sai (provider desmontado).
 */
export function UserDirectoryProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUserDirectory(
      (data) => {
        setUsers(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err, 'Não foi possível carregar os usuários.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user.uid, user])), [users]);

  const value = useMemo(() => ({ users, usersById, loading, error }), [users, usersById, loading, error]);

  return <UserDirectoryContext.Provider value={value}>{children}</UserDirectoryContext.Provider>;
}
