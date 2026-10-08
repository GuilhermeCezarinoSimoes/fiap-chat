import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionExpiredError } from '../services/apiClient';
import { requestMessageNotification, sendMessage, subscribeMessages } from '../services/chatService';
import { syncGroupMembers } from '../services/groupService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { getErrorMessage, isPermissionDenied } from '../utils/errors';
import { useAuth } from './useAuth';

export type SendMessageArgs = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

/**
 * Mensagens da conversa em tempo real (Realtime Database) e envio.
 * O listener é recriado quando a conversa muda e removido ao desmontar.
 */
export function useChat(uid: string, conversationId: string, conversationType: ConversationType, enabled = true) {
  const { expireSession } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null);
  const [subscriptionKey, setSubscriptionKey] = useState(0);
  const syncAttempted = useRef(false);

  useEffect(() => {
    syncAttempted.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeMessages(
      conversationId,
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        // Grupo recém-criado ou membros dessincronizados: pede à API que
        // replique a lista de membros no RTDB e tenta novamente uma vez.
        if (conversationType === 'group' && isPermissionDenied(err) && !syncAttempted.current) {
          syncAttempted.current = true;
          syncGroupMembers(conversationId)
            .then(() => setSubscriptionKey((key) => key + 1))
            .catch(() => {
              setError('Você não tem acesso às mensagens desta conversa.');
              setLoading(false);
            });
          return;
        }
        setError(
          isPermissionDenied(err)
            ? 'Você não tem acesso às mensagens desta conversa.'
            : getErrorMessage(err, 'Não foi possível carregar as mensagens.'),
        );
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [conversationId, conversationType, enabled, subscriptionKey]);

  const retry = useCallback(() => {
    syncAttempted.current = false;
    setSubscriptionKey((key) => key + 1);
  }, []);

  const send = useCallback(
    async ({ text, target, mentionedUserIds }: SendMessageArgs): Promise<boolean> => {
      setSending(true);
      setSendError(null);
      setNotifyWarning(null);
      let messageId: string;
      try {
        messageId = await sendMessage(uid, { conversationId, conversationType, text, target, mentionedUserIds });
      } catch (err: unknown) {
        setSendError(getErrorMessage(err, 'Falha ao enviar a mensagem. Tente novamente.'));
        setSending(false);
        return false;
      }
      setSending(false);

      // A mensagem já está persistida; o push é solicitado à API online.
      requestMessageNotification(conversationId, messageId).catch((err: unknown) => {
        if (err instanceof SessionExpiredError) {
          expireSession();
          return;
        }
        setNotifyWarning('Mensagem enviada, mas a notificação push não pôde ser disparada.');
      });
      return true;
    },
    [uid, conversationId, conversationType, expireSession],
  );

  const dismissSendError = useCallback(() => setSendError(null), []);

  return { messages, loading, error, sending, sendError, notifyWarning, send, retry, dismissSendError };
}
