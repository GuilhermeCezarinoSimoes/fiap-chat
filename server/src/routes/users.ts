import { Router, type Request, type Response } from 'express';
import { badRequest, forbidden, notFound } from '../errors.js';
import type { AuthenticatedLocals } from '../middleware/authenticate.js';
import { isSafeId, loadProfile, shareConversation } from '../services/chatRepository.js';

export const usersRouter = Router();

/**
 * GET /users/:uid/profile
 * Dados cadastrais só são liberados ao próprio usuário ou a quem compartilha
 * uma conversa individual ou um grupo com ele.
 */
usersRouter.get('/:uid/profile', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const targetId = req.params.uid;
  if (!isSafeId(targetId)) {
    throw badRequest('Usuário inválido.');
  }
  const requesterId = res.locals.uid;
  if (requesterId !== targetId && !(await shareConversation(requesterId, targetId))) {
    throw forbidden('Você só pode ver o perfil de quem participa de uma conversa com você.');
  }
  const profile = await loadProfile(targetId);
  if (!profile) {
    throw notFound('Perfil não encontrado.');
  }
  res.json({ user: profile });
});
