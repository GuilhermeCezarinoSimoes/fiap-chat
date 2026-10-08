import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../errors.js';
import { adminAuth } from '../services/firebaseAdmin.js';

export type AuthenticatedLocals = { uid: string };

/**
 * Valida o Firebase ID Token enviado em "Authorization: Bearer <token>".
 * checkRevoked=true rejeita tokens de sessões revogadas.
 */
export async function authenticate(
  req: Request,
  res: Response<unknown, AuthenticatedLocals>,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    next(unauthorized());
    return;
  }
  try {
    const decoded = await adminAuth().verifyIdToken(match[1], true);
    res.locals.uid = decoded.uid;
    next();
  } catch {
    next(unauthorized('Sessão inválida ou expirada. Faça login novamente.'));
  }
}
