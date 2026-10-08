import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { firestore } from './firebase';
import type { DeviceRegistration, NotificationRegistrationStatus, PushPayloadData } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

const DEVICE_ID_KEY = '@fiapchat/deviceId';
const DEVICE_ENABLED_KEY = '@fiapchat/notificationsEnabled';
export const MESSAGES_CHANNEL_ID = 'messages';

// Com o app em primeiro plano a notificação também é exibida.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const deviceDoc = (uid: string, deviceId: string) => doc(firestore, 'users', uid, 'devices', deviceId);

async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    return stored;
  }
  const created = randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function isNotificationsEnabledOnDevice(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEVICE_ENABLED_KEY)) !== 'false';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ED145B',
    });
  }
}

/** Solicita a autorização de notificações quando ainda não foi concedida. */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function getProjectId(): string | undefined {
  const fromExtra: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return fromExtra;
  }
  return Constants.easConfig?.projectId;
}

/**
 * Registra (ou atualiza) o token deste dispositivo em
 * users/{uid}/devices/{deviceId}. O documento só é legível pelo dono.
 */
export async function registerDevice(uid: string): Promise<NotificationRegistrationStatus> {
  if (!Device.isDevice) {
    return { state: 'unsupported-device' };
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { state: 'unsupported-device' };
  }
  try {
    await ensureAndroidChannel();
    const granted = await requestPermission();
    if (!granted) {
      return { state: 'permission-denied' };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return { state: 'error', message: 'Projeto EAS não configurado: não foi possível obter o token de push.' };
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) {
      return { state: 'error', message: 'Nenhum token de push disponível neste dispositivo.' };
    }

    const deviceId = await getDeviceId();
    const enabled = await isNotificationsEnabledOnDevice();
    const registration: DeviceRegistration = {
      token,
      provider: 'expo',
      platform: Platform.OS,
      enabled,
      updatedAt: Date.now(),
    };
    await setDoc(deviceDoc(uid, deviceId), registration);
    return enabled ? { state: 'registered', deviceId } : { state: 'disabled' };
  } catch (error: unknown) {
    return { state: 'error', message: getErrorMessage(error, 'Não foi possível registrar o dispositivo para notificações.') };
  }
}

/** Preferência de notificações deste dispositivo (salva localmente e no Firestore). */
export async function setNotificationsEnabledOnDevice(uid: string, enabled: boolean): Promise<NotificationRegistrationStatus> {
  await AsyncStorage.setItem(DEVICE_ENABLED_KEY, enabled ? 'true' : 'false');
  return registerDevice(uid);
}

/** Remove o token no logout para que o usuário anterior não receba mais pushes neste aparelho. */
export async function unregisterDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) {
    await deleteDoc(deviceDoc(uid, deviceId));
  }
}

/** Atualiza o registro quando o serviço de push troca o token do aparelho. */
export function subscribeTokenRefresh(uid: string, onStatus: (status: NotificationRegistrationStatus) => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerDevice(uid).then(onStatus);
  });
  return () => subscription.remove();
}

export function parsePushPayload(data: unknown): PushPayloadData | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const candidate = data as Record<string, unknown>;
  const { conversationId, conversationType } = candidate;
  if (typeof conversationId !== 'string' || (conversationType !== 'direct' && conversationType !== 'group')) {
    return null;
  }
  return { conversationId, conversationType };
}

/** Observa toques em notificações (app em segundo plano ou aberto). */
export function subscribeNotificationTaps(onTap: (payload: PushPayloadData) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = parsePushPayload(response.notification.request.content.data);
    if (payload) {
      onTap(payload);
    }
  });
  return () => subscription.remove();
}

/** Notificação que abriu o app quando ele estava fechado. */
export async function getInitialNotificationPayload(): Promise<PushPayloadData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return null;
  }
  const payload = parsePushPayload(response.notification.request.content.data);
  await Notifications.clearLastNotificationResponseAsync();
  return payload;
}
