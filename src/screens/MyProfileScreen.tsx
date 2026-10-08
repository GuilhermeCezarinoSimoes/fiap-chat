import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { ProfileDetails } from '../components/ProfileDetails';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { useImagePicker } from '../hooks/useImagePicker';
import { uploadProfilePhoto } from '../services/storageService';
import { updateProfilePhotoUrl } from '../services/userService';
import { colors, spacing } from '../theme/colors';
import type { AppScreenProps } from '../types/navigation';
import type { NotificationRegistrationStatus } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

const STATUS_LABEL: Record<NotificationRegistrationStatus['state'], string> = {
  idle: 'Aguardando registro',
  registering: 'Registrando dispositivo...',
  registered: 'Ativas neste dispositivo',
  disabled: 'Desativadas neste dispositivo',
  'permission-denied': 'Permissão negada pelo sistema',
  'unsupported-device': 'Dispositivo sem token de push (use um aparelho físico)',
  error: 'Falha no registro',
};

export function MyProfileScreen(_props: AppScreenProps<'MyProfile'>) {
  const { profile, profileLoading, profileError, logout } = useAuth();
  const notifications = useNotificationStatus();
  const photo = useImagePicker();
  const { reset: resetPhoto } = photo;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Perfil mais recente sem reexecutar o upload a cada atualização do perfil.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Ao escolher uma nova foto, envia ao Storage e grava apenas a URL.
  useEffect(() => {
    const currentProfile = profileRef.current;
    if (!photo.uri || !currentProfile) return;
    const localUri = photo.uri;
    let active = true;
    setUploading(true);
    setError(null);
    uploadProfilePhoto(localUri)
      .then((url) => updateProfilePhotoUrl(currentProfile, url))
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, 'Não foi possível atualizar a foto.'));
      })
      .finally(() => {
        if (active) {
          setUploading(false);
          resetPhoto();
        }
      });
    return () => {
      active = false;
    };
  }, [photo.uri, resetPhoto]);

  const { status } = notifications;
  const enabled = status.state === 'registered';
  const canToggle = status.state === 'registered' || status.state === 'disabled';

  const toggleNotifications = useCallback(
    (value: boolean) => void notifications.setEnabled(value),
    [notifications],
  );

  if (profileLoading) {
    return <Loading message="Carregando perfil..." />;
  }
  if (!profile) {
    return <ErrorMessage message={profileError ?? 'Perfil não encontrado.'} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProfileDetails user={profile} />
      <Button title="Alterar foto" variant="secondary" onPress={photo.choose} loading={uploading} />
      <ErrorMessage message={error ?? photo.error} />

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowTexts}>
            <Text style={styles.rowTitle}>Notificações push</Text>
            <Text style={styles.rowSubtitle}>{STATUS_LABEL[status.state]}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            disabled={!canToggle}
            trackColor={{ true: colors.primary, false: colors.placeholder }}
            accessibilityLabel="Ativar notificações neste dispositivo"
          />
        </View>
        {status.state === 'error' ? (
          <ErrorMessage message={status.message} onRetry={() => void notifications.retry()} />
        ) : null}
        {status.state === 'permission-denied' ? (
          <ErrorMessage
            tone="warning"
            message="Ative as notificações deste app nas configurações do aparelho e toque em tentar novamente."
            onRetry={() => void notifications.retry()}
          />
        ) : null}
      </View>

      <Button title="Sair" variant="danger" onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTexts: { flex: 1 },
  rowTitle: { fontWeight: '600', color: colors.text },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
