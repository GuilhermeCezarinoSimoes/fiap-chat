import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector } from '../components/PolicySelector';
import { TextField } from '../components/TextField';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useImagePicker } from '../hooks/useImagePicker';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { createGroup, updateGroup, type GroupMutationResult } from '../services/groupService';
import { colors, spacing } from '../theme/colors';
import type { GroupFormValues } from '../types/group';
import type { AppScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import {
  MAX_GROUP_LIMIT,
  parseMemberLimit,
  uniqueIds,
  validateGroupName,
  validateMemberCount,
  validateMemberLimit,
} from '../utils/groupValidation';

const DEFAULT_LIMIT = '10';

export function GroupFormScreen({ navigation, route }: AppScreenProps<'GroupForm'>) {
  const { groupId, selectedMemberIds } = route.params;
  const isEditing = Boolean(groupId);
  const { uid } = useCurrentUser();
  const { usersById } = useUserDirectory();
  const { group, loading, error: groupError, isOwner, accessLost } = useGroup(groupId, uid);
  const photo = useImagePicker();

  const [values, setValues] = useState<GroupFormValues>({
    name: '',
    memberLimit: DEFAULT_LIMIT,
    memberIds: [uid],
    notificationPolicy: 'all_group_messages',
    newPhotoUri: null,
  });
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ownerId = group?.ownerId ?? uid;

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar grupo' : 'Novo grupo' });
  }, [navigation, isEditing]);

  // Preenche o formulário uma única vez com os dados atuais do grupo.
  useEffect(() => {
    if (group && initializedFor !== group.id) {
      setValues({
        name: group.name,
        memberLimit: String(group.memberLimit),
        memberIds: group.memberIds,
        notificationPolicy: group.notificationPolicy,
        newPhotoUri: null,
      });
      setInitializedFor(group.id);
    }
  }, [group, initializedFor]);

  // Recebe os membros escolhidos na tela de Usuários.
  useEffect(() => {
    if (selectedMemberIds) {
      setValues((current) => ({ ...current, memberIds: uniqueIds([ownerId, ...selectedMemberIds]) }));
    }
  }, [selectedMemberIds, ownerId]);

  useEffect(() => {
    setValues((current) => ({ ...current, newPhotoUri: photo.uri }));
  }, [photo.uri]);

  const parsedLimit = useMemo(() => parseMemberLimit(values.memberLimit), [values.memberLimit]);
  const memberCount = values.memberIds.length;
  const availableSlots = parsedLimit !== null ? Math.max(parsedLimit - memberCount, 0) : null;
  const limitValidation = useMemo(() => validateMemberLimit(parsedLimit, memberCount), [parsedLimit, memberCount]);

  const members = useMemo(
    () =>
      values.memberIds.map((memberId) => ({
        uid: memberId,
        name: usersById.get(memberId)?.name ?? 'Usuário',
        photoUrl: usersById.get(memberId)?.photoUrl ?? '',
      })),
    [values.memberIds, usersById],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (memberId === ownerId) return;
      setValues((current) => ({ ...current, memberIds: current.memberIds.filter((id) => id !== memberId) }));
    },
    [ownerId],
  );

  const openMemberSelection = useCallback(() => {
    const limit = parsedLimit ?? MAX_GROUP_LIMIT;
    navigation.navigate('Users', {
      mode: 'selectMembers',
      selectedIds: values.memberIds.filter((id) => id !== ownerId),
      maxSelectable: Math.max(Math.min(limit, MAX_GROUP_LIMIT) - 1, 0),
    });
  }, [navigation, parsedLimit, values.memberIds, ownerId]);

  const showResult = useCallback((result: GroupMutationResult) => {
    if (result.warnings.length > 0) {
      Alert.alert('Atenção', result.warnings.join('\n\n'));
    }
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    const nameCheck = validateGroupName(values.name);
    if (!nameCheck.valid) return setFormError(nameCheck.message);
    if (!limitValidation.valid || parsedLimit === null) {
      return setFormError(limitValidation.valid ? 'Limite inválido.' : limitValidation.message);
    }
    const countCheck = validateMemberCount(values.memberIds, parsedLimit);
    if (!countCheck.valid) return setFormError(countCheck.message);

    setSaving(true);
    try {
      if (groupId) {
        const result = await updateGroup({
          groupId,
          requesterId: uid,
          name: values.name,
          memberLimit: parsedLimit,
          memberIds: values.memberIds,
          notificationPolicy: values.notificationPolicy,
          photoUri: values.newPhotoUri,
        });
        showResult(result);
        navigation.goBack();
      } else {
        const result = await createGroup({
          ownerId: uid,
          name: values.name,
          memberLimit: parsedLimit,
          memberIds: values.memberIds,
          notificationPolicy: values.notificationPolicy,
          photoUri: values.newPhotoUri,
        });
        showResult(result);
        navigation.replace('Chat', { conversationId: result.groupId, conversationType: 'group' });
      }
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Não foi possível salvar o grupo.'));
    } finally {
      setSaving(false);
    }
  }, [values, limitValidation, parsedLimit, groupId, uid, navigation, showResult]);

  if (isEditing && loading) {
    return <Loading message="Carregando grupo..." />;
  }
  if (isEditing && (accessLost || !group)) {
    return (
      <View style={styles.centered}>
        <ErrorMessage message={groupError ?? 'Você não tem acesso a este grupo.'} />
      </View>
    );
  }
  if (isEditing && !isOwner) {
    return (
      <View style={styles.centered}>
        <ErrorMessage message="Somente o proprietário pode editar o grupo." />
      </View>
    );
  }

  const photoUri = values.newPhotoUri ?? group?.photoUrl ?? null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker
          uri={photoUri}
          onPress={photo.choose}
          label={photoUri ? 'Alterar foto do grupo' : 'Escolher foto do grupo'}
          variant="group"
          error={photo.error}
          disabled={saving}
        />

        <TextField
          label="Nome do grupo"
          value={values.name}
          onChangeText={(name) => setValues((current) => ({ ...current, name }))}
          maxLength={50}
        />

        <TextField
          label={`Limite máximo de integrantes (2 a ${MAX_GROUP_LIMIT}, incluindo você)`}
          value={values.memberLimit}
          onChangeText={(memberLimit) =>
            setValues((current) => ({ ...current, memberLimit: memberLimit.replace(/\D/g, '') }))
          }
          keyboardType="number-pad"
          maxLength={2}
          error={limitValidation.valid ? undefined : limitValidation.message}
        />

        <View style={styles.capacity} accessibilityLiveRegion="polite">
          <Text style={styles.capacityText}>
            {memberCount} integrante(s) · {parsedLimit ?? '—'} vagas no total
          </Text>
          <Text style={[styles.capacityText, availableSlots === 0 && styles.full]}>
            {availableSlots === null
              ? 'Informe um limite válido'
              : availableSlots === 0
                ? 'Limite atingido — nenhuma vaga disponível'
                : `${availableSlots} vaga(s) disponível(is)`}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Integrantes</Text>
          <Pressable
            onPress={openMemberSelection}
            disabled={saving || availableSlots === null}
            accessibilityRole="button"
            style={styles.addButton}
          >
            <Ionicons name="person-add" size={18} color={colors.primary} />
            <Text style={styles.addText}>Selecionar</Text>
          </Pressable>
        </View>
        <View style={styles.members}>
          {members.map((member) => (
            <GroupMemberItem
              key={member.uid}
              name={member.name}
              photoUrl={member.photoUrl}
              subtitle={member.uid === ownerId ? 'Proprietário' : undefined}
              accessory={
                member.uid !== ownerId ? (
                  <Pressable
                    onPress={() => removeMember(member.uid)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${member.name}`}
                    hitSlop={8}
                  >
                    <Ionicons name="remove-circle" size={24} color={colors.danger} />
                  </Pressable>
                ) : undefined
              }
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Política de notificações</Text>
        <PolicySelector
          value={values.notificationPolicy}
          onChange={(notificationPolicy) => setValues((current) => ({ ...current, notificationPolicy }))}
          disabled={saving}
        />

        <ErrorMessage message={formError} />
        <Button title={isEditing ? 'Salvar alterações' : 'Criar grupo'} onPress={() => void handleSave()} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  capacity: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capacityText: { color: colors.text, fontWeight: '500' },
  full: { color: colors.danger },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginVertical: spacing.sm,
  },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { color: colors.primary, fontWeight: '600' },
  members: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
