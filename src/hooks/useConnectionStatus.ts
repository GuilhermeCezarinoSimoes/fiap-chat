import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { realtimeDb } from '../services/firebase';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

/** Estado de conexão com o Realtime Database (.info/connected). */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let hasConnectedOnce = false;
    const unsubscribe = onValue(ref(realtimeDb, '.info/connected'), (snapshot) => {
      const connected = snapshot.val() === true;
      if (connected) {
        hasConnectedOnce = true;
      }
      setStatus(connected ? 'online' : hasConnectedOnce ? 'offline' : 'connecting');
    });
    return unsubscribe;
  }, []);

  return status;
}
