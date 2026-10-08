import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { get, put } from '@vercel/blob';
import { Router, type Request, type Response } from 'express';
import { badRequest, forbidden, notFound } from '../errors.js';
import type { AuthenticatedLocals } from '../middleware/authenticate.js';
import { isDirectConversationId, isSafeId, loadGroup } from '../services/chatRepository.js';

/**
 * Fotos de perfil e de grupo no Vercel Blob em modo PRIVADO.
 * - Upload: somente o próprio usuário (perfil) ou o proprietário (grupo).
 * - Leitura: perfil por qualquer usuário autenticado; grupo somente por membros.
 * O Firestore guarda apenas a URL final (https://<api>/photos/...), nunca Base64.
 */
export const photosRouter = Router();

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(value: unknown): value is AllowedType {
  return typeof value === 'string' && (ALLOWED_TYPES as readonly string[]).includes(value);
}

/** Confere a assinatura binária para não aceitar arquivos que não sejam imagens. */
function matchesSignature(buffer: Buffer, type: AllowedType): boolean {
  if (type === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function parseImage(body: unknown): { buffer: Buffer; contentType: AllowedType } {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (!isAllowedType(record.contentType) || typeof record.data !== 'string') {
    throw badRequest('Envie uma imagem JPEG ou PNG.');
  }
  const buffer = Buffer.from(record.data, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw badRequest('A imagem deve ter no máximo 2 MB.');
  }
  if (!matchesSignature(buffer, record.contentType)) {
    throw badRequest('O arquivo enviado não é uma imagem válida.');
  }
  return { buffer, contentType: record.contentType };
}

function publicBaseUrl(req: Request): string {
  const host = req.get('host') ?? 'localhost';
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function storeImage(req: Request, pathname: string): Promise<string> {
  const { buffer, contentType } = parseImage(req.body);
  const extension = contentType === 'image/png' ? 'png' : 'jpg';
  const blob = await put(`${pathname}.${extension}`, buffer, {
    access: 'private',
    contentType,
    addRandomSuffix: true,
  });
  return `${publicBaseUrl(req)}/photos/${blob.pathname}`;
}

async function sendImage(res: Response, pathname: string): Promise<void> {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    throw notFound('Imagem não encontrada.');
  }
  res.setHeader('Content-Type', result.blob.contentType);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  Readable.fromWeb(result.stream as NodeReadableStream<Uint8Array>).pipe(res);
}

const isSafeFileName = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}\.(jpg|png)$/.test(value);

// ---------------------------- Upload ----------------------------

photosRouter.post('/profile', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const url = await storeImage(req, `users/${res.locals.uid}/avatar`);
  res.status(201).json({ url });
});

photosRouter.post('/groups/:groupId', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const { groupId } = req.params;
  if (!isSafeId(groupId) || isDirectConversationId(groupId)) {
    throw badRequest('Grupo inválido.');
  }
  const group = await loadGroup(groupId);
  if (!group) throw notFound('Grupo não encontrado.');
  if (group.ownerId !== res.locals.uid) {
    throw forbidden('Somente o proprietário pode alterar a foto do grupo.');
  }
  const url = await storeImage(req, `groups/${groupId}/photo`);
  res.status(201).json({ url });
});

// ---------------------------- Leitura ----------------------------

photosRouter.get('/users/:uid/:file', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const { uid, file } = req.params;
  if (!isSafeId(uid) || !isSafeFileName(file)) throw badRequest('Imagem inválida.');
  await sendImage(res, `users/${uid}/${file}`);
});

photosRouter.get('/groups/:groupId/:file', async (req: Request, res: Response<unknown, AuthenticatedLocals>) => {
  const { groupId, file } = req.params;
  if (!isSafeId(groupId) || !isSafeFileName(file)) throw badRequest('Imagem inválida.');
  const group = await loadGroup(groupId);
  if (!group || !group.memberIds.includes(res.locals.uid)) {
    throw forbidden('Somente integrantes podem ver a foto do grupo.');
  }
  await sendImage(res, `groups/${groupId}/${file}`);
});
