import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { request } from '../../api/client';
import {
  saveServerPushSettings,
  syncServerPushSettings,
  unregisterServerPushDevice,
} from './push-alert-service';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    multiSet: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'eas-test-project' } } } },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../../api/client', () => ({ request: jest.fn() }));

const stored = new Map<string, string>();

describe('server push device registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stored.clear();

    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => stored.get(key) ?? null);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      stored.set(key, value);
    });
    jest.mocked(AsyncStorage.multiSet).mockImplementation(async (entries) => {
      entries.forEach(([key, value]) => stored.set(key, value));
    });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      stored.delete(key);
    });
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: true,
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: true,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
      data: 'ExpoPushToken[current-token]',
    } as Awaited<ReturnType<typeof Notifications.getExpoPushTokenAsync>>);
    jest.mocked(request).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets a fresh Expo token and stores preferences only after backend registration', async () => {
    stored.set('boutica.serverPushToken.v1', 'ExpoPushToken[stale-token]');

    await saveServerPushSettings({ stock: true, sales: false });

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'boutica-server-alerts',
      expect.objectContaining({ name: 'Alertes Boutica' }),
    );
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'eas-test-project',
    });
    expect(request).toHaveBeenCalledWith('/api/v1/notifications/devices', {
      method: 'POST',
      body: {
        token: 'ExpoPushToken[current-token]',
        stockAlerts: true,
        salesAlerts: false,
      },
    });
    expect(stored.get('boutica.serverPushToken.v1')).toBe('ExpoPushToken[current-token]');
    expect(stored.get('boutica.serverPushSettings.v1')).toBe('{"stock":true,"sales":false}');
  });

  it('does not save enabled preferences when device permission is refused', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);

    await expect(saveServerPushSettings({ stock: false, sales: true })).rejects.toThrow(
      'Autorisez les notifications Boutica dans les réglages du téléphone.',
    );

    expect(request).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('does not persist enabled preferences when backend registration fails', async () => {
    jest.mocked(request).mockRejectedValue(new Error('Connexion impossible'));

    await expect(syncServerPushSettings({ stock: true, sales: false })).rejects.toThrow(
      'Connexion impossible',
    );

    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('removes the device remotely before clearing the locally stored token', async () => {
    stored.set('boutica.serverPushToken.v1', 'ExpoPushToken[current-token]');

    await unregisterServerPushDevice();

    expect(request).toHaveBeenCalledWith('/api/v1/notifications/devices', {
      method: 'DELETE',
      body: { token: 'ExpoPushToken[current-token]' },
    });
    expect(stored.has('boutica.serverPushToken.v1')).toBe(false);
  });
});
