import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Credenciais administrativas lidas SOMENTE de variáveis de ambiente secretas
 * configuradas na hospedagem (Vercel). Nada disso existe no repositório.
 */
const REQUIRED_ENV = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_DATABASE_URL'] as const;

export function missingFirebaseEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const missing = missingFirebaseEnv();
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  }
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Na Vercel a chave é salva em uma linha, com "\n" literais.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return app;
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminFirestore = (): Firestore => getFirestore(getAdminApp());
export const adminDatabase = (): Database => getDatabase(getAdminApp());
