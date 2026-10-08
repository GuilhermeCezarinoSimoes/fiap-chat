import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationRegistrationStatus, PushPayloadData } from '../types/notification';

type NotificationContextValue = {
  status: NotificationRegistrationStatus;
  retry: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

type Props = {
  uid: string;
  onOpenConversation: (payload: PushPayloadData) => void;
  children: ReactNode;
};

export function NotificationProvider({ uid, onOpenConversation, children }: Props) {
  const { status, retry, setEnabled } = useNotifications(uid, onOpenConversation);
  const value = useMemo(() => ({ status, retry, setEnabled }), [status, retry, setEnabled]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationStatus(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationStatus deve ser usado dentro de NotificationProvider');
  }
  return context;
}
