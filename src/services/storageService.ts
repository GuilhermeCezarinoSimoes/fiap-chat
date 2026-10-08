import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { API_URL, apiRequest } from './apiClient';
import { AppError } from '../utils/errors';

/**
 * Fotos de perfil e de grupo são guardadas no Vercel Blob em modo privado,
 * por meio da API (que valida o usuário e, no caso de grupos, o proprietário).
 * O Firestore guarda apenas a URL final retornada; nunca Base64.
 */

const MAX_DIMENSION = 512;

/** Redimensiona e comprime a imagem escolhida antes do envio. */
async function prepareImage(localUri: string): Promise<string> {
  try {
    const result = await manipulateAsync(localUri, [{ resize: { width: MAX_DIMENSION } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!result.base64) {
      throw new Error('empty');
    }
    return result.base64;
  } catch {
    throw new AppError('image-read', 'Não foi possível processar a imagem selecionada.');
  }
}

async function uploadImage(path: string, localUri: string): Promise<string> {
  const data = await prepareImage(localUri);
  const response = await apiRequest<{ url: string }>(path, {
    method: 'POST',
    body: JSON.stringify({ contentType: 'image/jpeg', data }),
  });
  return response.url;
}

export function uploadProfilePhoto(localUri: string): Promise<string> {
  return uploadImage('/photos/profile', localUri);
}

export function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`/photos/groups/${encodeURIComponent(groupId)}`, localUri);
}

/** Fotos privadas servidas pela API exigem o Firebase ID Token no cabeçalho. */
export function isProtectedPhotoUrl(url: string): boolean {
  return url.startsWith(`${API_URL}/photos/`);
}
