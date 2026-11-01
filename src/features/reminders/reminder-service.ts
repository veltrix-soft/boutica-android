import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AndroidImportance, SchedulableTriggerInputTypes,
} from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'boutica.reminders.v1';
const ANDROID_CHANNEL_ID = 'boutica-reminders';
const MAX_CUSTOM_REMINDERS = 20;

export type DailyReminderSettings = {
  time: string;
  stock: boolean;
  receivables: boolean;
  sales: boolean;
};

export type CustomReminder = {
  notificationId: string;
  message: string;
  scheduledAt: string;
};

type ReminderStore = {
  daily: DailyReminderSettings;
  dailyNotificationId: string | null;
  custom: CustomReminder[];
};

export const DEFAULT_DAILY_REMINDERS: DailyReminderSettings = {
  time: '09:00',
  stock: false,
  receivables: false,
  sales: false,
};

const EMPTY_STORE: ReminderStore = {
  daily: DEFAULT_DAILY_REMINDERS,
  dailyNotificationId: null,
  custom: [],
};

function isReminderStore(value: unknown): value is ReminderStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Record<string, unknown>;
  if (!store.daily || typeof store.daily !== 'object' || !Array.isArray(store.custom)) return false;

  const daily = store.daily as Record<string, unknown>;
  return (
    typeof daily.time === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(daily.time)
    && typeof daily.stock === 'boolean'
    && typeof daily.receivables === 'boolean'
    && typeof daily.sales === 'boolean'
    && (store.dailyNotificationId === null || typeof store.dailyNotificationId === 'string')
    && store.custom.every((reminder) => {
      if (!reminder || typeof reminder !== 'object') return false;
      const item = reminder as Record<string, unknown>;
      return (
        typeof item.notificationId === 'string'
        && typeof item.message === 'string'
        && typeof item.scheduledAt === 'string'
        && Number.isFinite(Date.parse(item.scheduledAt))
      );
    })
  );
}

async function readStore(): Promise<ReminderStore> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return EMPTY_STORE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Les préférences de rappel sont illisibles. Effacez-les puis réessayez.');
  }

  if (!isReminderStore(parsed)) {
    throw new Error('Les préférences de rappel sont invalides. Effacez-les puis réessayez.');
  }
  return parsed;
}

async function writeStore(store: ReminderStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function loadReminderSettings(): Promise<{
  daily: DailyReminderSettings;
  custom: CustomReminder[];
}> {
  const store = await readStore();
  const custom = store.custom.filter((item) => Date.parse(item.scheduledAt) > Date.now());
  if (custom.length !== store.custom.length) {
    await writeStore({ ...store, custom });
  }
  return { daily: store.daily, custom };
}

async function ensurePermission(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Rappels Boutica',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;

  const requested = await Notifications.requestPermissionsAsync();
  if (!requested.granted) {
    throw new Error('Autorisez les notifications Boutica dans les réglages du téléphone pour programmer un rappel.');
  }
}

function getDailyReminderBody(settings: DailyReminderSettings): string {
  const reminders = [
    settings.stock ? 'vérifier le stock faible' : null,
    settings.receivables ? 'faire le point sur les créances à suivre' : null,
    settings.sales ? 'assurer le suivi des ventes' : null,
  ].filter((reminder): reminder is string => reminder !== null);
  return `Pensez à ${reminders.join(', ')}.`;
}

export async function saveDailyReminderSettings(
  settings: DailyReminderSettings,
): Promise<void> {
  const previous = await readStore();
  const hasReminder = settings.stock || settings.receivables || settings.sales;

  if (!hasReminder) {
    if (previous.dailyNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(previous.dailyNotificationId);
    }
    await writeStore({ ...previous, daily: settings, dailyNotificationId: null });
    return;
  }

  await ensurePermission();
  const [hour, minute] = settings.time.split(':').map(Number);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23
    || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('Choisissez une heure de rappel valide.');
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rappel Boutica',
      body: getDailyReminderBody(settings),
      data: { kind: 'daily-reminder' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });

  try {
    await writeStore({ ...previous, daily: settings, dailyNotificationId: notificationId });
  } catch (error) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    throw error;
  }

  if (previous.dailyNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(previous.dailyNotificationId);
    } catch (error) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await writeStore(previous);
      throw error;
    }
  }
}

export async function scheduleTestReminder(): Promise<void> {
  await ensurePermission();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Boutica',
      body: 'Les notifications sont activées sur cet appareil.',
      data: { kind: 'test-reminder' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

export async function scheduleCustomReminder(
  message: string,
  scheduledAt: Date,
): Promise<CustomReminder> {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) throw new Error('Saisissez le texte du rappel.');
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    throw new Error('Choisissez une date et une heure futures.');
  }

  const previous = await readStore();
  if (previous.custom.length >= MAX_CUSTOM_REMINDERS) {
    throw new Error(`Vous pouvez programmer au maximum ${MAX_CUSTOM_REMINDERS} rappels personnalisés.`);
  }

  await ensurePermission();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rappel Boutica',
      body: normalizedMessage,
      data: { kind: 'custom-reminder' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: scheduledAt,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });

  const reminder = {
    notificationId,
    message: normalizedMessage,
    scheduledAt: scheduledAt.toISOString(),
  };
  try {
    await writeStore({ ...previous, custom: [...previous.custom, reminder] });
  } catch (error) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    throw error;
  }
  return reminder;
}

export async function cancelCustomReminder(notificationId: string): Promise<void> {
  const previous = await readStore();
  const reminder = previous.custom.find((item) => item.notificationId === notificationId);
  if (!reminder) throw new Error('Ce rappel n’existe plus.');

  await Notifications.cancelScheduledNotificationAsync(notificationId);
  await writeStore({
    ...previous,
    custom: previous.custom.filter((item) => item.notificationId !== notificationId),
  });
}
