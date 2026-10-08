import { useEffect, useMemo, useState } from 'react';
import { subscribeDirectConversations } from '../services/chatService';
import { subscribeMyGroups } from '../services/groupService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';
import { getOtherParticipantId } from '../utils/conversationId';
import { getErrorMessage } from '../utils/errors';

/** Lista combinada (tempo real) de conversas individuais e grupos do usuário. */
export function useConversations(uid: string) {
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [directsLoaded, setDirectsLoaded] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeDirectConversations(
      uid,
      (data) => {
        setDirects(data);
        setDirectsLoaded(true);
      },
      (err) => {
        setError(getErrorMessage(err, 'Não foi possível carregar as conversas.'));
        setDirectsLoaded(true);
      },
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    const unsubscribe = subscribeMyGroups(
      uid,
      (data) => {
        setGroups(data);
        setGroupsLoaded(true);
      },
      (err) => {
        setError(getErrorMessage(err, 'Não foi possível carregar os grupos.'));
        setGroupsLoaded(true);
      },
    );
    return unsubscribe;
  }, [uid]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems: ConversationSummary[] = directs.flatMap((conversation) => {
      const otherUserId = getOtherParticipantId(conversation.id, uid);
      return otherUserId ? [{ kind: 'direct', conversation, otherUserId, sortKey: conversation.createdAt }] : [];
    });
    const groupItems: ConversationSummary[] = groups.map((group) => ({ kind: 'group', group, sortKey: group.updatedAt }));
    // Ordenação sem mutar os arrays de estado.
    return [...directItems, ...groupItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [directs, groups, uid]);

  return { conversations, loading: !directsLoaded || !groupsLoaded, error };
}
