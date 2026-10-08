import { Router, type Request, type Response } from 'express';
import { badRequest, forbidden, notFound } from '../errors.js';
import type { AuthenticatedLocals } from '../middleware/authenticate.js';
import {
  disableDevices,
  isSafeId,
  loadConversation,
  loadDeviceTokens,
  loadDisplayName,
  loadMessage,
  syncGroupMembersMirror,
} from '../services/chatRepository.js';
import { claimDispatch, completeDispatch } from '../services/dispatchLock.js';
import { sendPushNotifications, type PushContent } from '../services/notificationSender.js';
import { isMentioned, resolveRecipients } from '../services/recipientResolver.js';

export const notificationsRouter = Router();

/**
 * POST /notifications/messages
 * Body: { conversationId, messageId }
 *
 * 1. ID Token já validado pelo middleware (uid em res.locals).
 * 2. Confirma no RTDB que a mensagem existe e que o remetente é o usuário autenticado.
 * 3. Consulta no Firestore participantes, política e tokens.
 * 4. Calcula os destinatários no servidor e envia o push.
 */
notificationsRouter.post('/messages', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const body: unknown = req.body;
  const conversationId = typeof body === 'object' && body !== null && 'conversationId' in body ? body.conversationId : undefined;
  const messageId = typeof body === 'object' && body !== null && 'messageId' in body ? body.messageId : undefined;
  if (!isSafeId(conversationId) || !isSafeId(messageId)) {
    throw badRequest('Informe conversationId e messageId válidos.');
  }
  const uid = res.locals.uid;

  const message = await loadMessage(conversationId, messageId);
  if (!message) {
    throw notFound('Mensagem não encontrada.');
  }
  if (message.senderId !== uid) {
    throw forbidden('Somente o autor da mensagem pode solicitar a notificação.');
  }

  const context = await loadConversation(conversationId);
  if (!context || context.type !== message.conversationType) {
    throw notFound('Conversa não encontrada.');
  }
  const participants = context.type === 'direct' ? context.conversation.participantIds : context.group.memberIds;
  if (!participants.includes(uid)) {
    throw forbidden('Você não participa desta conversa.');
  }
  if (context.type === 'group') {
    // Mantém o espelho de membros do RTDB coerente com o Firestore.
    await syncGroupMembersMirror(context.group.id, context.group.memberIds);
  }

  const claim = await claimDispatch(conversationId, messageId, uid);
  if (!claim.acquired) {
    res.status(200).json({ status: 'duplicate', recipients: 0 });
    return;
  }

  try {
    const recipients = resolveRecipients(context, message);
    if (recipients.length === 0) {
      await completeDispatch(conversationId, messageId, { status: 'no_recipients', recipients: 0, sent: 0, failed: 0 });
      res.status(200).json({ status: 'no_recipients', recipients: 0 });
      return;
    }

    const [senderName, devices] = await Promise.all([loadDisplayName(uid), loadDeviceTokens(recipients)]);
    const data = { conversationId, conversationType: message.conversationType, messageId };

    // O texto não expõe o conteúdo da mensagem, apenas quem enviou.
    const contentFor = (recipientId: string): PushContent =>
      context.type === 'direct'
        ? { title: senderName, body: 'Enviou uma nova mensagem para você.', data }
        : {
            title: context.group.name,
            body: isMentioned(message, recipientId)
              ? `${senderName} mencionou você.`
              : `Nova mensagem de ${senderName}.`,
            data,
          };

    const result = await sendPushNotifications(devices, contentFor);
    await disableDevices(result.invalidDevices, 'DeviceNotRegistered');
    await completeDispatch(conversationId, messageId, {
      status: 'sent',
      recipients: recipients.length,
      sent: result.sent,
      failed: result.failed,
    });
    res.status(200).json({ status: 'sent', recipients: recipients.length, devices: result.sent });
  } catch (error: unknown) {
    // Libera nova tentativa do mesmo messageId.
    await completeDispatch(conversationId, messageId, { status: 'failed', recipients: 0, sent: 0, failed: 0 }).catch(
      () => undefined,
    );
    throw error;
  }
});
