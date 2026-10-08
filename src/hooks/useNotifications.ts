import { useCallback, useEffect, useState } from 'react';
import {
  getInitialNotificationPayload,
  registerDevice,
  setNotificationsEnabledOnDevice,
  subscribeNotificationTaps,
  subscribeTokenRefresh,
} from '../services/notificationService';
import type { NotificationRegistrationStatus, PushPayloadData } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

/**
 * Registro do dispositivo, renovação do token e tratamento do toque nas
 * notificações (app aberto, em segundo plano ou fechado).
 */
export function useNotifications(uid: string, onOpenConversation: (payload: PushPayloadData) => void) {
  const [status, setStatus] = useState<NotificationRegistrationStatus>({ state: 'idle' });

  const register = useCallback(async () => {
    setStatus({ state: 'registering' });
    setStatus(await registerDevice(uid));
  }, [uid]);

  useEffect(() => {
    void register();
    return subscribeTokenRefresh(uid, setStatus);
  }, [uid, register]);

  useEffect(() => {
    let active = true;
    void getInitialNotificationPayload().then((payload) => {
      if (active && payload) {
        onOpenConversation(payload);
      }
    });
    const unsubscribe = subscribeNotificationTaps(onOpenConversation);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [onOpenConversation]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      setStatus({ state: 'registering' });
      try {
        setStatus(await setNotificationsEnabledOnDevice(uid, enabled));
      } catch (error: unknown) {
        setStatus({ state: 'error', message: getErrorMessage(error, 'Não foi possível salvar a preferência.') });
      }
    },
    [uid],
  );

  return { status, retry: register, setEnabled };
}
