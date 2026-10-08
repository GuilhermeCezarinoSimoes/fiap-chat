import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors, spacing } from '../theme/colors';
import type { AppScreenProps } from '../types/navigation';
import type { UserDirectoryEntry } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export function UsersScreen({ navigation, route }: AppScreenProps<'Users'>) {
  const { mode, selectedIds: initialSelected, maxSelectable } = route.params;
  const { uid } = useCurrentUser();
  const { users, loading, error } = useUserDirectory();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (initialSelected ?? []).filter((id) => id !== uid));
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSelectMode = mode === 'selectMembers';

  // O próprio usuário nunca aparece na lista: não é possível selecioná-lo.
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => user.uid !== uid && (term.length === 0 || user.nameLower.includes(term)));
  }, [users, uid, search]);

  // maxSelectable considera o proprietário, que já ocupa uma vaga.
  const selectionLimitReached = maxSelectable !== undefined && selectedIds.length >= maxSelectable;

  const confirmSelection = useCallback(() => {
    navigation.popTo('GroupForm', { selectedMemberIds: selectedIds }, { merge: true });
  }, [navigation, selectedIds]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isSelectMode ? 'Selecionar membros' : 'Nova conversa',
      headerRight: isSelectMode
        ? () => (
            <Pressable onPress={confirmSelection} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Concluir</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, isSelectMode, confirmSelection]);

  const handlePress = useCallback(
    async (user: UserDirectoryEntry) => {
      setActionError(null);
      if (isSelectMode) {
        if (selectedIds.includes(user.uid)) {
          setSelectedIds((current) => current.filter((id) => id !== user.uid));
        } else if (maxSelectable !== undefined && selectedIds.length >= maxSelectable) {
          setActionError(`Limite atingido: no máximo ${maxSelectable} membros além de você.`);
        } else {
          setSelectedIds((current) => [...current, user.uid]);
        }
        return;
      }
      setOpeningId(user.uid);
      try {
        const conversationId = await getOrCreateDirectConversation(uid, user.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err: unknown) {
        setActionError(getErrorMessage(err, 'Não foi possível iniciar a conversa.'));
      } finally {
        setOpeningId(null);
      }
    },
    [isSelectMode, maxSelectable, selectedIds, uid, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: UserDirectoryEntry }) => {
      const selected = selectedIds.includes(item.uid);
      return (
        <GroupMemberItem
          name={item.name}
          photoUrl={item.photoUrl}
          subtitle={openingId === item.uid ? 'Abrindo conversa...' : undefined}
          selected={isSelectMode ? selected : undefined}
          disabled={(isSelectMode && !selected && selectionLimitReached) || openingId !== null}
          onPress={() => void handlePress(item)}
        />
      );
    },
    [selectedIds, isSelectMode, selectionLimitReached, openingId, handlePress],
  );

  if (loading) {
    return <Loading message="Carregando usuários..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nome"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          accessibilityLabel="Buscar usuários"
        />
        {isSelectMode ? (
          <Text style={styles.counter}>
            {selectedIds.length} selecionado(s)
            {maxSelectable !== undefined ? ` · máximo ${maxSelectable}` : ''}
          </Text>
        ) : null}
        <ErrorMessage message={error ?? actionError} onDismiss={actionError ? () => setActionError(null) : undefined} />
      </View>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={filteredUsers.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="person-outline"
            title={search ? 'Nenhum usuário encontrado' : 'Nenhum outro usuário cadastrado'}
            description={search ? 'Tente buscar por outro nome.' : 'Peça para alguém da turma criar uma conta.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { padding: spacing.md },
  search: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  counter: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  headerAction: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyList: { flexGrow: 1 },
});
