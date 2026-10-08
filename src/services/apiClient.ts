import { auth } from './firebase';
import { AppError } from '../utils/errors';

/**
 * URL pública da API de notificações (Vercel). Pode ser sobrescrita pela
 * variável EXPO_PUBLIC_API_URL; não é um segredo.
 */
const DEFAULT_API_URL = 'https://SEU-PROJETO-API.vercel.app';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 20_000;

type ApiErrorBody = { error?: { code?: string; message?: string } };

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value;
}

export class SessionExpiredError extends AppError {
  constructor() {
    super('session-expired', 'Sua sessão expirou. Faça login novamente.');
  }
}

async function doFetch(path: string, init: RequestInit, forceRefresh: boolean): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new SessionExpiredError();
  }
  const token = await user.getIdToken(forceRefresh);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AppError('network', 'Não foi possível contactar o servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Chama a API autenticando com o Firebase ID Token do usuário.
 * Em caso de 401, renova o token uma vez antes de considerar a sessão expirada.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await doFetch(path, init, false);
  if (response.status === 401) {
    response = await doFetch(path, init, true);
    if (response.status === 401) {
      throw new SessionExpiredError();
    }
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isApiErrorBody(body) ? body.error?.message : undefined;
    const code = isApiErrorBody(body) ? body.error?.code : undefined;
    throw new AppError(code ?? `http-${response.status}`, message ?? 'O servidor não conseguiu concluir a operação.');
  }
  return body as T;
}
