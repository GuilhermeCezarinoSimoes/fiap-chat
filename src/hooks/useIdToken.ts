import { onIdTokenChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';

/** Firebase ID Token atual, renovado automaticamente pelo SDK. */
export function useIdToken(enabled: boolean): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setToken(null);
      return undefined;
    }
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (!user) {
        setToken(null);
        return;
      }
      user
        .getIdToken()
        .then((value) => {
          if (active) setToken(value);
        })
        .catch(() => {
          if (active) setToken(null);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled]);

  return token;
}
