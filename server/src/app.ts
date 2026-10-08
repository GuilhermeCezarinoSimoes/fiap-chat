import express, { type NextFunction, type Request, type Response } from 'express';
import { HttpError } from './errors.js';
import { authenticate } from './middleware/authenticate.js';
import { groupsRouter } from './routes/groups.js';
import { notificationsRouter } from './routes/notifications.js';
import { photosRouter } from './routes/photos.js';
import { usersRouter } from './routes/users.js';
import { missingFirebaseEnv } from './services/firebaseAdmin.js';

const app = express();

app.disable('x-powered-by');
// Fotos chegam em Base64 apenas no transporte (convertidas em binário antes de gravar).
app.use('/photos', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '10kb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'FIAP Chat API',
    endpoints: [
      'GET /health',
      'POST /notifications/messages',
      'POST /groups/:groupId/sync-members',
      'GET /users/:uid/profile',
      'POST /photos/profile',
      'POST /photos/groups/:groupId',
      'GET /photos/users/:uid/:file',
      'GET /photos/groups/:groupId/:file',
    ],
  });
});

/** Verificação de integridade: não exige autenticação e não expõe segredos. */
app.get('/health', (_req, res) => {
  const missing = missingFirebaseEnv();
  const storageConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  res.status(missing.length === 0 ? 200 : 503).json({
    status: missing.length === 0 ? 'ok' : 'misconfigured',
    firebaseConfigured: missing.length === 0,
    photoStorageConfigured: storageConfigured,
    timestamp: new Date().toISOString(),
  });
});

app.use('/notifications', authenticate, notificationsRouter);
app.use('/groups', authenticate, groupsRouter);
app.use('/users', authenticate, usersRouter);
app.use('/photos', authenticate, photosRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
});

// Tratamento central de erros: mensagens seguras, detalhes só no log do servidor.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'A imagem enviada é grande demais.' } });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'bad_request', message: 'JSON inválido.' } });
    return;
  }
  console.error('[api] erro inesperado:', error);
  res.status(500).json({ error: { code: 'internal', message: 'Erro interno. Tente novamente em instantes.' } });
});

export default app;
