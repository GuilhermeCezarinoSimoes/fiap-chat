import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing } from '../theme/colors';
import type { AuthScreenProps } from '../types/navigation';
import type { LoginInput } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { hasErrors, validateLogin, type FieldErrors } from '../utils/formValidation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { login, notice, clearNotice } = useAuth();
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateField = useCallback((field: keyof LoginInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const handleLogin = useCallback(async () => {
    const errors = validateLogin(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    setError(null);
    clearNotice();
    try {
      await login(form);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }, [form, login, clearNotice]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>FIAP Chat</Text>
            <Text style={styles.subtitle}>Converse com sua turma em tempo real</Text>
          </View>

          <ErrorMessage message={notice} tone="warning" onDismiss={clearNotice} />
          <ErrorMessage message={error} />

          <TextField
            label="E-mail"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          <TextField
            label="Senha"
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            error={fieldErrors.password}
            onSubmitEditing={() => void handleLogin()}
          />

          <Button title="Entrar" onPress={() => void handleLogin()} loading={loading} />
          <Button
            title="Criar conta"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
});
