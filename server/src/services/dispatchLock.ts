import { adminFirestore } from './firebaseAdmin.js';

/** Tempo após o qual um envio "processing" travado pode ser reprocessado. */
const STALE_PROCESSING_MS = 60_000;

export type DispatchClaim = { acquired: true } | { acquired: false; status: string };

const dispatchDoc = (conversationId: string, messageId: string) =>
  adminFirestore().collection('notificationDispatches').doc(`${conversationId}__${messageId}`);

/**
 * Proteção contra chamadas duplicadas: reserva o envio da mensagem numa
 * transação do Firestore. Duas requisições simultâneas para a mesma mensagem
 * não conseguem ambas obter a reserva — a segunda recebe "duplicate".
 */
export async function claimDispatch(conversationId: string, messageId: string, requesterId: string): Promise<DispatchClaim> {
  const ref = dispatchDoc(conversationId, messageId);
  return adminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (snapshot.exists && data) {
      const status = typeof data.status === 'string' ? data.status : 'unknown';
      const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0;
      const stale = status === 'processing' && Date.now() - updatedAt > STALE_PROCESSING_MS;
      if (status !== 'failed' && !stale) {
        return { acquired: false, status };
      }
    }
    transaction.set(ref, {
      conversationId,
      messageId,
      requestedBy: requesterId,
      status: 'processing',
      updatedAt: Date.now(),
    });
    return { acquired: true };
  });
}

export async function completeDispatch(
  conversationId: string,
  messageId: string,
  result: { status: 'sent' | 'no_recipients' | 'failed'; recipients: number; sent: number; failed: number },
): Promise<void> {
  await dispatchDoc(conversationId, messageId).set({ ...result, updatedAt: Date.now() }, { merge: true });
}
