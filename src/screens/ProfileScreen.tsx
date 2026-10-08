import { ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { ProfileDetails } from '../components/ProfileDetails';
import { useSharedProfile } from '../hooks/useSharedProfile';
import { colors, spacing } from '../theme/colors';
import type { AppScreenProps } from '../types/navigation';

/**
 * Perfil de outro participante. Os dados cadastrais só são liberados pela API
 * quando existe conversa individual ou grupo em comum.
 */
export function ProfileScreen({ route }: AppScreenProps<'Profile'>) {
  const { user, loading, error, reload } = useSharedProfile(route.params.uid);

  if (loading) {
    return <Loading message="Carregando perfil..." />;
  }

  if (error || !user) {
    return (
      <View style={styles.container}>
        <EmptyState icon="person-circle-outline" title="Perfil indisponível" />
        <View style={styles.error}>
          <ErrorMessage message={error ?? 'Perfil não encontrado.'} onRetry={reload} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProfileDetails user={user} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  error: { padding: spacing.lg },
});
