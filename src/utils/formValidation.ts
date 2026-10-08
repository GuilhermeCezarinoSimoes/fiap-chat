import type { LoginInput, RegisterInput } from '../types/user';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Converte DD/MM/AAAA em AAAA-MM-DD, ou null se a data for inválida/futura. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isSameDate =
    date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
  if (!isSameDate || date.getTime() > Date.now() || Number(year) < 1900) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

/** Aplica a máscara DD/MM/AAAA enquanto o usuário digita. */
export function maskBirthDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Formata AAAA-MM-DD como DD/MM/AAAA para exibição. */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export function formatPhone(digits: string): string {
  const clean = onlyDigits(digits);
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return clean;
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Informe um e-mail válido.';
  }
  if (input.password.length === 0) {
    errors.password = 'Informe sua senha.';
  }
  return errors;
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) {
    errors.name = 'O nome deve ter entre 2 e 60 caracteres.';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Informe um e-mail válido.';
  }
  if (input.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (input.password !== input.passwordConfirmation) {
    errors.passwordConfirmation = 'As senhas não conferem.';
  }
  const phone = onlyDigits(input.phoneNumber);
  if (phone.length < 10 || phone.length > 13) {
    errors.phoneNumber = 'Informe um celular com DDD (10 a 13 dígitos).';
  }
  if (parseBirthDate(input.birthDate) === null) {
    errors.birthDate = 'Informe uma data válida no formato DD/MM/AAAA.';
  }
  if (input.photoUri === null) {
    errors.photoUri = 'Selecione uma foto de perfil.';
  }
  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some((value) => typeof value === 'string' && value.length > 0);
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
