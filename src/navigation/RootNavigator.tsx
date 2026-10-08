import { NavigationContainer, StackActions, createNavigationContainerRef } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { NotificationProvider } from '../contexts/NotificationContext';
import { UserDirectoryProvider } from '../contexts/UserDirectoryContext';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing } from '../theme/colors';
import type { AppStackParamList } from '../types/navigation';
import type { PushPayloadData } from '../types/notification';

const navigationRef = createNavigationContainerRef<AppStackParamList>();

function ProfileMissing({ message, onLogout }: { message: string | null; onLogout: () => void }) {
  return (
    <View style={styles.missing}>
      <EmptyState icon="alert-circle-outline" title="Perfil não encontrado" description="Não foi possível carregar seu cadastro." />
      <ErrorMessage message={message} />
      <Button title="Sair" variant="danger" onPress={onLogout} />
    </View>
  );
}

export function RootNavigator() {
  const { status, firebaseUser, profile, profileLoading, profileError, isRegistering, logout } = useAuth();
  const pendingConversation = useRef<PushPayloadData | null>(null);

  // Abre a conversa indicada no payload da notificação tocada.
  const openConversation = useCallback((payload: PushPayloadData) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.push('Chat', payload));
    } else {
      pendingConversation.current = payload;
    }
  }, []);

  const handleReady = useCallback(() => {
    const pending = pendingConversation.current;
    if (pending) {
      pendingConversation.current = null;
      navigationRef.dispatch(StackActions.push('Chat', pending));
    }
  }, []);

  if (status === 'loading') {
    return <Loading message="Recuperando sessão..." />;
  }
  if (status === 'signing-out') {
    return <Loading message="Saindo..." />;
  }
  if (status === 'unauthenticated' || !firebaseUser) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }
  if (isRegistering || profileLoading) {
    return <Loading message="Carregando seu perfil..." />;
  }
  if (!profile) {
    return <ProfileMissing message={profileError} onLogout={() => void logout()} />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleReady}>
      <UserDirectoryProvider>
        <NotificationProvider uid={firebaseUser.uid} onOpenConversation={openConversation}>
          <AppStack />
        </NotificationProvider>
      </UserDirectoryProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
});
