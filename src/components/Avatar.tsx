import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIdToken } from '../hooks/useIdToken';
import { isProtectedPhotoUrl } from '../services/storageService';
import { colors } from '../theme/colors';

type Props = {
  uri: string | null | undefined;
  size?: number;
  variant?: 'user' | 'group';
};

/** Foto com imagem padrão quando a URL não existe ou falha ao carregar. */
export function Avatar({ uri, size = 44, variant = 'user' }: Props) {
  const [failed, setFailed] = useState(false);
  // Fotos privadas (servidas pela API) exigem o ID Token do usuário logado.
  const isProtected = Boolean(uri) && isProtectedPhotoUrl(uri ?? '');
  const token = useIdToken(isProtected);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const showFallback = !uri || failed || (isProtected && token === null);

  if (showFallback) {
    return (
      <View
        style={[styles.fallback, dimension]}
        accessibilityRole="image"
        accessibilityLabel={variant === 'group' ? 'Foto padrão do grupo' : 'Foto padrão do usuário'}
      >
        <Ionicons name={variant === 'group' ? 'people' : 'person'} size={size * 0.55} color={colors.surface} />
      </View>
    );
  }

  return (
    <Image
      source={isProtected && token ? { uri, headers: { Authorization: `Bearer ${token}` }, cacheKey: uri } : { uri }}
      style={[styles.image, dimension]}
      contentFit="cover"
      transition={150}
      onError={() => setFailed(true)}
      accessibilityLabel={variant === 'group' ? 'Foto do grupo' : 'Foto do usuário'}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: colors.border,
  },
});
