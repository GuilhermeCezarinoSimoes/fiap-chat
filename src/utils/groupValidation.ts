import type { ChatGroup } from '../types/group';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 50;

export type ValidationResult = { valid: true } | { valid: false; message: string };

export function parseMemberLimit(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
}

export function validateMemberLimit(limit: number | null, currentMemberCount: number): ValidationResult {
  if (limit === null || !Number.isInteger(limit)) {
    return { valid: false, message: 'O limite de integrantes deve ser um número inteiro.' };
  }
  if (limit < MIN_GROUP_MEMBERS) {
    return { valid: false, message: `O limite mínimo é de ${MIN_GROUP_MEMBERS} integrantes.` };
  }
  if (limit > MAX_GROUP_LIMIT) {
    return { valid: false, message: `O limite máximo permitido é de ${MAX_GROUP_LIMIT} integrantes.` };
  }
  if (limit < currentMemberCount) {
    return {
      valid: false,
      message: `O limite não pode ser menor que a quantidade atual de integrantes (${currentMemberCount}).`,
    };
  }
  return { valid: true };
}

export function validateGroupName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, message: 'O nome do grupo deve ter entre 2 e 50 caracteres.' };
  }
  return { valid: true };
}

export function validateMemberCount(memberIds: readonly string[], limit: number): ValidationResult {
  if (memberIds.length < MIN_GROUP_MEMBERS) {
    return { valid: false, message: 'O grupo precisa ter pelo menos 2 integrantes (você e mais alguém).' };
  }
  if (memberIds.length > limit) {
    return { valid: false, message: `O grupo atingiu o limite de ${limit} integrantes.` };
  }
  return { valid: true };
}

export function availableSlots(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): number {
  return Math.max(group.memberLimit - group.memberIds.length, 0);
}

/** Remove duplicados preservando a ordem, sem mutar o array recebido. */
export function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids));
}
