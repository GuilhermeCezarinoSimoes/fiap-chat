import { Ionicons } from '@expo/vector-icons';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { POLICY_LABELS } from '../components/PolicySelector';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { removeMember } from '../services/groupService';
import { colors, spacing } from '../theme/colors';
import type { AppScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';

type MemberRow = { uid: string; name: string; photoUrl: string; isOwner: boolean };

export function GroupMembersScreen({ navigation, route }: AppScreenProps<'GroupMembers'>) {
  const { groupId } = route.params;
  const { uid } = useCurrentUser();
  const { usersById } = useUserDirectory();
  const { group, loading, error, accessLost, isOwner, slots } = useGroup(groupId, uid);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Integrantes',
      headerRight: isOwner
        ? () => (
            <Pressable
              onPress={() => navigation.navigate('GroupForm', { groupId })}
              accessibilityRole="button"
              accessibilityLabel="Editar grupo"
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, isOwner, groupId]);

  const members = useMemo<MemberRow[]>(() => {
    if (!group) return [];
    const rows = group.memberIds.map((memberId) => ({
      uid: memberId,
      name: usersById.get(memberId)?.name ?? 'Usuário',
      photoUrl: usersById.get(memberId)?.photoUrl ?? '',
      isOwner: memberId === group.ownerId,
    }));
    // Proprietário primeiro, depois ordem alfabética (cópia ordenada).
    return [...rows].sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name));
  }, [group, usersById]);

  const confirmRemove = useCallback(
    (member: MemberRow) => {
      Alert.alert('Remover integrante', `Remover ${member.name} do grupo? Ele não verá novas mensagens.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setRemovingId(member.uid);
            setActionError(null);
            removeMember(groupId, uid, member.uid)
              .catch((err: unknown) => setActionError(getErrorMessage(err, 'Não foi possível remover o integrante.')))
              .finally(() => setRemovingId(null));
          },
        },
      ]);
    },
    [groupId, uid],
  );

  if (loading) {
    return <Loading message="Carregando integrantes..." />;
  }
  if (accessLost || !group) {
    return <EmptyState icon="lock-closed-outline" title="Grupo indisponível" description={error ?? 'Você não faz parte deste grupo.'} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar uri={group.photoUrl} size={96} variant="group" />
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.meta}>
              {group.memberIds.length}/{group.memberLimit} integrantes · {slots} vaga(s) disponível(is)
            </Text>
            <Text style={styles.meta}>Notificações: {POLICY_LABELS[group.notificationPolicy].title}</Text>
            <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} />
          </View>
        }
        renderItem={({ item }) => (
          <GroupMemberItem
            name={item.uid === uid ? `${item.name} (você)` : item.name}
            photoUrl={item.photoUrl}
            subtitle={item.isOwner ? 'Proprietário' : removingId === item.uid ? 'Removendo...' : 'Membro'}
            onPress={() => navigation.navigate('Profile', { uid: item.uid })}
            accessory={
              isOwner && !item.isOwner ? (
                <Pressable
                  onPress={() => confirmRemove(item)}
                  disabled={removingId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="remove-circle-outline" size={24} color={colors.danger} />
                </Pressable>
              ) : undefined
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  name: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
});
