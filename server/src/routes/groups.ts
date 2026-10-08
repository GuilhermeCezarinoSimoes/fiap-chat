import { Router, type Request, type Response } from 'express';
import { badRequest, forbidden, notFound } from '../errors.js';
import type { AuthenticatedLocals } from '../middleware/authenticate.js';
import { isDirectConversationId, isSafeId, loadGroup, syncGroupMembersMirror } from '../services/chatRepository.js';

export const groupsRouter = Router();

/**
 * POST /groups/:groupId/sync-members
 * Copia a lista oficial de membros (Firestore) para o RTDB. Idempotente.
 * Pode ser chamada por qualquer membro atual (ex.: o proprietário após
 * remover alguém, ou um membro ao abrir o chat).
 */
groupsRouter.post('/:groupId/sync-members', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const { groupId } = req.params;
  if (!isSafeId(groupId) || isDirectConversationId(groupId)) {
    throw badRequest('Grupo inválido.');
  }
  const group = await loadGroup(groupId);
  if (!group) {
    await syncGroupMembersMirror(groupId, null);
    throw notFound('Grupo não encontrado.');
  }
  // Sincroniza mesmo quando o solicitante não é membro, para revogar o acesso
  // de quem foi removido; mas só informa detalhes a membros.
  await syncGroupMembersMirror(group.id, group.memberIds);
  if (!group.memberIds.includes(res.locals.uid)) {
    throw forbidden('Você não é integrante deste grupo.');
  }
  res.json({ memberCount: group.memberIds.length });
});
