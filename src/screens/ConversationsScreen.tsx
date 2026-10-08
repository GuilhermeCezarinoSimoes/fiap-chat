import { Ionicons } from '@expo/vector-icons';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useConversations } from '../hooks/useConversations';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { colors, spacing } from '../theme/colors';
import type { ConversationSummary } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import type { NotificationRegistrationStatus } from '../types/notification';

function notificationWarning(status: NotificationRegistrationStatus): string | null {
  switch (status.state) {
    case 'permission-denied':
      return 'Notificações bloqueadas. Ative a permissão nas configurações do aparelho para receber avisos de novas mensagens.';
    case 'unsupported-device':
      return 'Este dispositivo não possui token de push disponível (use um aparelho físico).';
    case 'error':
      return status.message;
    default:
      return null;
  }
}

export function ConversationsScreen({ navigation }: AppScreenProps<'Conversations'>) {
  const { uid, profile } = useCurrentUser();
  const { logout } = useAuth();
  const { usersById } = useUserDirectory();
  const { conversations, loading, error } = useConversations(uid);
  const connection = useConnectionStatus();
  const notifications = useNotificationStatus();

  const confirmLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.navigate('MyProfile')}
          accessibilityRole="button"
          accessibilityLabel="Meu perfil"
          style={styles.headerAvatar}
        >
          <Avatar uri={profile?.photoUrl} size={32} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={confirmLogout} accessibilityRole="button" accessibilityLabel="Sair" hitSlop={8}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, profile?.photoUrl, confirmLogout]);

  const openConversation = useCallback(
    (item: ConversationSummary) => {
      if (item.kind === 'direct') {
        navigation.navigate('Chat', { conversationId: item.conversation.id, conversationType: 'direct' });
      } else {
        navigation.navigate('Chat', { conversationId: item.group.id, conversationType: 'group' });
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => {
      if (item.kind === 'direct') {
        const other = usersById.get(item.otherUserId);
        return (
          <ConversationItem
            type="direct"
            title={other?.name ?? 'Usuário'}
            subtitle="Conversa individual"
            photoUrl={other?.photoUrl ?? ''}
            onPress={() => openConversation(item)}
          />
        );
      }
      const { group } = item;
      return (
        <ConversationItem
          type="group"
          title={group.name}
          subtitle={`${group.memberIds.length}/${group.memberLimit} integrantes${group.ownerId === uid ? ' · você é o proprietário' : ''}`}
          photoUrl={group.photoUrl}
          onPress={() => openConversation(item)}
        />
      );
    },
    [usersById, openConversation, uid],
  );

  const keyExtractor = useCallback(
    (item: ConversationSummary) => (item.kind === 'direct' ? item.conversation.id : item.group.id),
    [],
  );

  const warning = useMemo(() => notificationWarning(notifications.status), [notifications.status]);

  return (
    <View style={styles.container}>
      <ConnectionBanner status={connection} />
      {warning ? (
        <View style={styles.banner}>
          <ErrorMessage message={warning} tone="warning" onRetry={() => void notifications.retry()} />
        </View>
      ) : null}
      {error ? (
        <View style={styles.banner}>
          <ErrorMessage message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading message="Carregando conversas..." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhuma conversa ainda"
              description="Inicie uma conversa individual ou crie um grupo usando os botões abaixo."
            />
          }
        />
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('GroupForm', {})}
          accessibilityRole="button"
          accessibilityLabel="Criar grupo"
        >
          <Ionicons name="people" size={22} color={colors.primary} />
          <Text style={styles.fabTextSecondary}>Novo grupo</Text>
        </Pressable>
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('Users', { mode: 'direct' })}
          accessibilityRole="button"
          accessibilityLabel="Nova conversa individual"
        >
          <Ionicons name="chatbubble" size={20} color={colors.surface} />
          <Text style={styles.fabText}>Nova conversa</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerAvatar: { marginRight: spacing.sm },
  banner: { paddingHorizontal: spacing.md },
  emptyList: { flexGrow: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    height: 48,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fabText: { color: colors.surface, fontWeight: '700' },
  fabTextSecondary: { color: colors.primary, fontWeight: '700' },
});
