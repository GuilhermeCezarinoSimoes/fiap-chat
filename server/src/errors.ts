/** Erro HTTP com mensagem segura para o cliente (sem detalhes internos). */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new HttpError(400, 'bad_request', message);
export const unauthorized = (message = 'Autenticação necessária.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Você não tem permissão para esta ação.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Recurso não encontrado.') => new HttpError(404, 'not_found', message);
