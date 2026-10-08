import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { isFirebaseConfigured } from './services/firebase';
import { colors, spacing } from './theme/colors';

function FirebaseNotConfigured() {
  return (
    <View style={styles.config}>
      <Text style={styles.title}>Firebase não configurado</Text>
      <Text style={styles.text}>
        Preencha o arquivo firebaseConfig.json na raiz do projeto com a configuração do app do Firebase e reinicie o
        Expo. Consulte o README.md.
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isFirebaseConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <FirebaseNotConfigured />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  config: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  text: { color: colors.textMuted, lineHeight: 20 },
});
