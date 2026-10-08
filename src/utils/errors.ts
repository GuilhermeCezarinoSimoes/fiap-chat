import { FirebaseError } from 'firebase/app';

/** Erro de domínio com mensagem já pronta para o usuário. */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'O e-mail informado é inválido.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'auth/requires-recent-login': 'Sua sessão expirou. Faça login novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  PERMISSION_DENIED: 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível. Verifique sua conexão e tente novamente.',
  'deadline-exceeded': 'A operação demorou demais. Tente novamente.',
  'not-found': 'O item solicitado não foi encontrado.',
  aborted: 'Outra alteração foi feita ao mesmo tempo. Tente novamente.',
  'failed-precondition': 'Não foi possível concluir a operação no estado atual.',
  'storage/unauthorized': 'Você não tem permissão para enviar esta imagem.',
  'storage/canceled': 'O envio da imagem foi cancelado.',
  'storage/retry-limit-exceeded': 'Falha de conexão ao enviar a imagem.',
  'storage/quota-exceeded': 'Limite de armazenamento atingido.',
};

function messageFromText(text: string): string | null {
  if (/permission[_ ]denied/i.test(text)) {
    return FIREBASE_MESSAGES['permission-denied'];
  }
  if (/network|offline|failed to fetch/i.test(text)) {
    return 'Falha de conexão. Verifique sua internet.';
  }
  return null;
}

/**
 * Converte qualquer erro em uma mensagem compreensível, sem expor detalhes
 * internos, códigos de servidor ou credenciais.
 */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? messageFromText(error.message) ?? fallback;
  }
  if (error instanceof Error) {
    return messageFromText(error.message) ?? fallback;
  }
  return fallback;
}

export function isPermissionDenied(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED';
  }
  return error instanceof Error && /permission[_ ]denied/i.test(error.message);
}
