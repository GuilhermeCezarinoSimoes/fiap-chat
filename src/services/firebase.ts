import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';
import rawConfig from '../../firebaseConfig.json';

type FirebaseClientConfig = Required<
  Pick<
    FirebaseOptions,
    'apiKey' | 'authDomain' | 'databaseURL' | 'projectId' | 'storageBucket' | 'messagingSenderId' | 'appId'
  >
>;

const firebaseConfig: FirebaseClientConfig = rawConfig;

/** Detecta o firebaseConfig.json ainda com os marcadores do repositório. */
export const isFirebaseConfigured =
  !firebaseConfig.apiKey.startsWith('COLE_AQUI') && !firebaseConfig.projectId.startsWith('SEU-PROJETO');

function createApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function createAuth(app: FirebaseApp): Auth {
  try {
    // Persistência em AsyncStorage: a sessão é recuperada ao reabrir o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth lança erro se já foi chamado (ex.: fast refresh).
    return getAuth(app);
  }
}

export const firebaseApp = createApp();
export const auth = createAuth(firebaseApp);
export const firestore: Firestore = getFirestore(firebaseApp);
export const realtimeDb: Database = getDatabase(firebaseApp);
