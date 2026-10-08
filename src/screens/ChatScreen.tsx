import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { colors, spacing } from '../theme/colors';
import type { ChatMessage as ChatMessageType } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import type { UserDirectoryEntry } from '../types/user';
import { getOtherParticipantId } from '../utils/conversationId';

export function ChatScreen({ navigation, route }: AppScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const { uid } = useCurrentUser();
  const { usersById } = useUserDirectory();
  const headerHeight = useHeaderHeight();

  const otherUserId = useMemo(
    () => (isGroup ? null : getOtherParticipantId(conversationId, uid)),
    [isGroup, conversationId, uid],
  );
  const { group, loading: groupLoading, accessLost, isOwner } = useGroup(isGroup ? conversationId : undefined, uid);

  // Membro removido: o listener de mensagens é desligado imediatamente.
  const canAccess = isGroup ? !accessLost && group !== null : otherUserId !== null;
  const chat = useChat(uid, conversationId, conversationType, canAccess);

  const otherUser = otherUserId ? usersById.get(otherUserId) : undefined;
  const title = isGroup ? (group?.name ?? 'Grupo') : (otherUser?.name ?? 'Conversa');
  const photoUrl = isGroup ? group?.photoUrl : otherUser?.photoUrl;

  const openDetails = useCallback(() => {
    if (isGroup) {
      navigation.navigate('GroupMembers', { groupId: conversationId });
    } else if (otherUserId) {
      navigation.navigate('Profile', { uid: otherUserId });
    }
  }, [isGroup, navigation, conversationId, otherUserId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={openDetails}
          style={styles.headerTitle}
          accessibilityRole="button"
          accessibilityLabel={isGroup ? `Ver integrantes de ${title}` : `Ver perfil de ${title}`}
        >
          <Avatar uri={photoUrl} size={34} variant={isGroup ? 'group' : 'user'} />
          <View style={styles.headerTexts}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            {isGroup && group ? (
              <Text style={styles.headerSub}>
                {group.memberIds.length}/{group.memberLimit} integrantes
              </Text>
            ) : null}
          </View>
        </Pressable>
      ),
      headerRight:
        isGroup && isOwner
          ? () => (
              <Pressable
                onPress={() => navigation.navigate('GroupForm', { groupId: conversationId })}
                accessibilityRole="button"
                accessibilityLabel="Editar grupo"
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={22} color={colors.primary} />
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, openDetails, isGroup, title, photoUrl, group, isOwner, conversationId]);

  const mentionableMembers = useMemo<UserDirectoryEntry[] | undefined>(() => {
    if (!group) return undefined;
    return group.memberIds
      .filter((memberId) => memberId !== uid)
      .map((memberId) => usersById.get(memberId))
      .filter((member): member is UserDirectoryEntry => member !== undefined);
  }, [group, uid, usersById]);

  // FlatList invertida: cópia invertida, sem mutar o estado.
  const invertedMessages = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageType }) => {
      const mentionNames = item.mentionedUserIds.map((id) => usersById.get(id)?.name ?? 'membro');
      return (
        <ChatMessage
          message={item}
          isOwn={item.senderId === uid}
          authorName={isGroup ? (usersById.get(item.senderId)?.name ?? 'Ex-integrante') : null}
          mentionNames={mentionNames}
        />
      );
    },
    [uid, isGroup, usersById],
  );

  if (isGroup && groupLoading) {
    return <Loading message="Abrindo grupo..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.blocked}>
        <EmptyState
          icon="lock-closed-outline"
          title="Conversa indisponível"
          description={
            isGroup
              ? 'Você não é mais integrante deste grupo e não pode ler ou enviar novas mensagens.'
              : 'Esta conversa não pertence a você.'
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {chat.error ? (
        <View style={styles.banner}>
          <ErrorMessage message={chat.error} onRetry={chat.retry} />
        </View>
      ) : null}

      {chat.loading ? (
        <Loading message="Carregando mensagens..." />
      ) : (
        <FlatList
          data={invertedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted={invertedMessages.length > 0}
          contentContainerStyle={invertedMessages.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            chat.error ? null : (
              <EmptyState icon="chatbubble-ellipses-outline" title="Nenhuma mensagem ainda" description="Envie a primeira mensagem!" />
            )
          }
        />
      )}

      <View style={styles.banner}>
        <ErrorMessage message={chat.sendError} onDismiss={chat.dismissSendError} />
        <ErrorMessage message={chat.notifyWarning} tone="warning" />
      </View>

      <ChatInput
        onSend={chat.send}
        sending={chat.sending}
        disabled={chat.error !== null}
        mentionableMembers={isGroup ? mentionableMembers : undefined}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  blocked: { flex: 1, backgroundColor: colors.background },
  banner: { paddingHorizontal: spacing.md },
  list: { paddingVertical: spacing.sm },
  emptyList: { flexGrow: 1 },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 240,
  },
  headerTexts: { flexShrink: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted },
});
