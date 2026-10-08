import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import type { ChatUser } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { formatIsoDate, formatPhone } from '../utils/formValidation';

const UNAVAILABLE = 'Não informado';

function Field({ label, value }: { label: string; value: string }) {
  const available = value.trim().length > 0;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !available && styles.unavailable]}>{available ? value : UNAVAILABLE}</Text>
    </View>
  );
}

export function ProfileDetails({ user }: { user: ChatUser }) {
  return (
    <View>
      <View style={styles.header}>
        <Avatar uri={user.photoUrl} size={120} />
        <Text style={styles.name}>{user.name || UNAVAILABLE}</Text>
      </View>
      <View style={styles.card}>
        <Field label="E-mail" value={user.email} />
        <Field label="Celular" value={user.phoneNumber ? formatPhone(user.phoneNumber) : ''} />
        <Field label="Data de nascimento" value={user.birthDate ? formatIsoDate(user.birthDate) : ''} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.xl },
  name: {
    marginTop: spacing.md,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  field: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 16, color: colors.text, marginTop: 2 },
  unavailable: { color: colors.textMuted, fontStyle: 'italic' },
});
