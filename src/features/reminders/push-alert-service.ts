import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { request } from '../../api/client';

const SETTINGS_KEY = 'boutica.serverPushSettings.v1';
const TOKEN_KEY = 'boutica.serverPushToken.v1';
const ANDROID_CHANNEL_ID = 'boutica-server-alerts';

export type ServerPushSettings = {
  stock: boolean;
  sales: boolean;
};

export const DEFAULT_SERVER_PUSH_SETTINGS: ServerPushSettings = {
  stock: false,
  sales: false,
};

function isServerPushSettings(value: unknown): value is ServerPushSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return typeof settings.stock === 'boolean' && typeof settings.sales === 'boolean';
}

export async function loadServerPushSettings(): Promise<ServerPushSettings> {
  const stored = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!stored) return DEFAULT_SERVER_PUSH_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Les préférences d’alertes serveur sont illisibles. Réessayez après les avoir réinitialisées.');
  }

  if (!isServerPushSettings(parsed)) {
    throw new Error('Les préférences d’alertes serveur sont invalides.');
  }

  return parsed;
}

async function getExpoPushToken(): Promise<string> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    throw new Error('Les alertes serveur nécessitent un téléphone physique.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Alertes Boutica',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Autorisez les notifications Boutica dans les réglages du téléphone.');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('Le projet EAS n’est pas configuré pour les notifications.');
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function registerDevice(settings: ServerPushSettings): Promise<void> {
  const token = await getExpoPushToken();
  await request<void>('/api/v1/notifications/devices', {
    method: 'POST',
    body: {
      token,
      stockAlerts: settings.stock,
      salesAlerts: settings.sales,
    },
  });
  await AsyncStorage.multiSet([
    [SETTINGS_KEY, JSON.stringify(settings)],
    [TOKEN_KEY, token],
  ]);
}

export async function syncServerPushSettings(settings: ServerPushSettings): Promise<void> {
  if (settings.stock || settings.sales) {
    await registerDevice(settings);
  }
}

export async function saveServerPushSettings(settings: ServerPushSettings): Promise<void> {
  const hasAlerts = settings.stock || settings.sales;
  const registeredToken = await AsyncStorage.getItem(TOKEN_KEY);

  if (hasAlerts) {
    await registerDevice(settings);
    return;
  }

  if (registeredToken) {
    await request<void>('/api/v1/notifications/devices', {
      method: 'DELETE',
      body: { token: registeredToken },
    });
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function unregisterServerPushDevice(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;

  await request<void>('/api/v1/notifications/devices', {
    method: 'DELETE',
    body: { token },
  });
  await AsyncStorage.removeItem(TOKEN_KEY);
}
