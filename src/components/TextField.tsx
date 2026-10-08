import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, spacing } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...inputProps}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
