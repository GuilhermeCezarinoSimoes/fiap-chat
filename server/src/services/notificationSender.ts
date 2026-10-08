import type { ConversationType, DeviceToken } from '../types.js';

/**
 * Envio pelo Expo Push Service. No Android a entrega é feita pelo Firebase
 * Cloud Messaging (credencial FCM v1 cadastrada no EAS); no iOS, pelo APNs.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export type PushContent = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: ConversationType; messageId: string };
};

type ExpoPushMessage = PushContent & {
  to: string;
  sound: 'default';
  priority: 'high';
  channelId: string;
};

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export type SendResult = {
  sent: number;
  failed: number;
  invalidDevices: DeviceToken[];
};

export function isExpoPushToken(token: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

function isTicketArray(value: unknown): value is ExpoPushTicket[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'status' in item);
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function postBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  const response = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
  const body: unknown = await response.json().catch(() => null);
  const data = typeof body === 'object' && body !== null && 'data' in body ? body.data : null;
  if (!response.ok || !isTicketArray(data)) {
    throw new Error(`Expo Push respondeu ${response.status}`);
  }
  return data;
}

/**
 * Envia um push por dispositivo. Tokens rejeitados com DeviceNotRegistered
 * (ou com formato inválido) são devolvidos para desativação.
 */
export async function sendPushNotifications(
  devices: DeviceToken[],
  contentFor: (uid: string) => PushContent,
  channelId = 'messages',
): Promise<SendResult> {
  const invalidDevices = devices.filter((device) => !isExpoPushToken(device.token));
  const validDevices = devices.filter((device) => isExpoPushToken(device.token));
  let sent = 0;
  let failed = invalidDevices.length;

  for (const group of chunk(validDevices, BATCH_SIZE)) {
    const messages: ExpoPushMessage[] = group.map((device) => ({
      ...contentFor(device.uid),
      to: device.token,
      sound: 'default',
      priority: 'high',
      channelId,
    }));
    const tickets = await postBatch(messages);
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent += 1;
        return;
      }
      failed += 1;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidDevices.push(group[index]);
      }
    });
  }
  return { sent, failed, invalidDevices };
}
