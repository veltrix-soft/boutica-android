import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasCompletedOnboarding, markOnboardingCompleted } from './onboarding-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

describe('onboarding completion storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats a new installation as not onboarded', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    await expect(hasCompletedOnboarding()).resolves.toBe(false);
  });

  it('restores a previously completed onboarding', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');

    await expect(hasCompletedOnboarding()).resolves.toBe(true);
  });

  it('persists onboarding completion without swallowing storage errors', async () => {
    jest.mocked(AsyncStorage.setItem).mockResolvedValue();

    await markOnboardingCompleted();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'boutica.onboarding.completed.v1',
      'true',
    );

    jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('Storage unavailable'));
    await expect(markOnboardingCompleted()).rejects.toThrow('Storage unavailable');
  });
});
