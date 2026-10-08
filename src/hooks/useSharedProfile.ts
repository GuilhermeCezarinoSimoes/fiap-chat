import { useCallback, useEffect, useState } from 'react';
import { SessionExpiredError } from '../services/apiClient';
import { fetchSharedProfile } from '../services/userService';
import type { ChatUser } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from './useAuth';

/** Perfil de outro usuário, liberado pela API apenas se houver conversa/grupo em comum. */
export function useSharedProfile(uid: string) {
  const { profile: ownProfile, expireSession } = useAuth();
  const isSelf = ownProfile?.uid === uid;
  const [user, setUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(!isSelf);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isSelf) {
      setUser(ownProfile);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchSharedProfile(uid)
      .then((data) => {
        if (active) setUser(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          expireSession();
          return;
        }
        setError(getErrorMessage(err, 'Não foi possível carregar o perfil.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, isSelf, ownProfile, expireSession, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { user, loading, error, reload };
}
