import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

type Source = 'library' | 'camera';

/** Seleção de foto com tratamento de permissões da galeria e da câmera. */
export function useImagePicker() {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFrom = useCallback(async (source: Source) => {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Permissão da câmera negada. Libere o acesso nas configurações para tirar uma foto.'
          : 'Permissão da galeria negada. Libere o acesso nas configurações para escolher uma foto.',
      );
      if (!permission.canAskAgain) {
        Alert.alert('Permissão necessária', 'Abra as configurações do aparelho para liberar o acesso.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
        ]);
      }
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    };
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets.length > 0) {
        setUri(result.assets[0].uri);
      }
    } catch {
      setError('Não foi possível abrir o seletor de imagens.');
    }
  }, []);

  const choose = useCallback(() => {
    Alert.alert('Foto', 'Escolha a origem da imagem', [
      { text: 'Galeria', onPress: () => void pickFrom('library') },
      { text: 'Câmera', onPress: () => void pickFrom('camera') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [pickFrom]);

  const reset = useCallback(() => setUri(null), []);

  return { uri, error, choose, reset };
}
