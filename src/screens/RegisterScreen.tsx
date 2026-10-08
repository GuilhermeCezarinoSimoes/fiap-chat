import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { PhotoPicker } from '../components/PhotoPicker';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { useImagePicker } from '../hooks/useImagePicker';
import { colors, spacing } from '../theme/colors';
import type { AuthScreenProps } from '../types/navigation';
import type { RegisterInput } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { hasErrors, maskBirthDate, onlyDigits, validateRegister, type FieldErrors } from '../utils/formValidation';

type TextFields = Exclude<keyof RegisterInput, 'photoUri'>;

const INITIAL_FORM: RegisterInput = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  phoneNumber: '',
  birthDate: '',
  photoUri: null,
};

export function RegisterScreen(_props: AuthScreenProps<'Register'>) {
  const { register } = useAuth();
  const photo = useImagePicker();
  const [form, setForm] = useState<RegisterInput>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sincroniza a foto escolhida com o formulário.
  useEffect(() => {
    setForm((current) => ({ ...current, photoUri: photo.uri }));
    if (photo.uri) {
      setFieldErrors((current) => ({ ...current, photoUri: undefined }));
    }
  }, [photo.uri]);

  const updateField = useCallback((field: TextFields, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const handleRegister = useCallback(async () => {
    const errors = validateRegister(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await register(form);
      // Após o cadastro a sessão é aberta e o navegador troca para as telas do app.
      if (result.photoUploadFailed) {
        Alert.alert('Conta criada', 'Sua conta foi criada, mas a foto não pôde ser enviada. Você pode alterá-la em "Meu perfil".');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível criar a conta. Tente novamente.'));
      setLoading(false);
    }
  }, [form, register]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker
          uri={form.photoUri}
          onPress={photo.choose}
          label={form.photoUri ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
          error={fieldErrors.photoUri ?? photo.error}
          disabled={loading}
        />

        <ErrorMessage message={error} />

        <TextField
          label="Nome"
          value={form.name}
          onChangeText={(value) => updateField('name', value)}
          autoComplete="name"
          maxLength={60}
          error={fieldErrors.name}
        />
        <TextField
          label="E-mail"
          value={form.email}
          onChangeText={(value) => updateField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <TextField
          label="Celular (com DDD)"
          value={form.phoneNumber}
          onChangeText={(value) => updateField('phoneNumber', onlyDigits(value))}
          keyboardType="phone-pad"
          placeholder="11999998888"
          maxLength={13}
          error={fieldErrors.phoneNumber}
        />
        <TextField
          label="Data de nascimento"
          value={form.birthDate}
          onChangeText={(value) => updateField('birthDate', maskBirthDate(value))}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          error={fieldErrors.birthDate}
        />
        <TextField
          label="Senha"
          value={form.password}
          onChangeText={(value) => updateField('password', value)}
          secureTextEntry
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <TextField
          label="Confirmar senha"
          value={form.passwordConfirmation}
          onChangeText={(value) => updateField('passwordConfirmation', value)}
          secureTextEntry
          autoComplete="new-password"
          error={fieldErrors.passwordConfirmation}
        />

        <Button title="Criar conta" onPress={() => void handleRegister()} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.xl,
  },
});
