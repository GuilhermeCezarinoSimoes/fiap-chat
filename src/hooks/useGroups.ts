import { useEffect, useMemo, useState } from 'react';
import { subscribeGroup } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage, isPermissionDenied } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';

/**
 * Grupo em tempo real. Detecta quando o usuário deixa de ser membro
 * (removido pelo proprietário) para bloquear a conversa imediatamente.
 */
export function useGroup(groupId: string | undefined, uid: string) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setAccessLost(false);
    const unsubscribe = subscribeGroup(
      groupId,
      (data) => {
        setGroup(data);
        setAccessLost(data === null || !data.memberIds.includes(uid));
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (isPermissionDenied(err)) {
          setAccessLost(true);
        } else {
          setError(getErrorMessage(err, 'Não foi possível carregar o grupo.'));
        }
        setGroup(null);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [groupId, uid]);

  const derived = useMemo(
    () => ({
      isOwner: group !== null && group.ownerId === uid,
      memberCount: group?.memberIds.length ?? 0,
      slots: group ? availableSlots(group) : 0,
    }),
    [group, uid],
  );

  return { group, loading, error, accessLost, ...derived };
}
