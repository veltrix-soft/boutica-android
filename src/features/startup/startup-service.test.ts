import { describe, expect, it, jest } from '@jest/globals';
import { request } from '../../api/client';
import {
  checkBackendHealth,
  getSignedOutStartupRoute,
  STARTUP_CHECK_TIMEOUT_MS,
  withStartupTimeout,
} from './startup-service';

jest.mock('../../api/client', () => ({ request: jest.fn() }));

describe('startup routing and connectivity', () => {
  it('shows the welcome screen until onboarding has been completed', () => {
    expect(getSignedOutStartupRoute(false)).toBe('/welcome');
    expect(getSignedOutStartupRoute(true)).toBe('/login');
  });

  it('checks the existing backend health endpoint without authenticating', async () => {
    jest.mocked(request).mockResolvedValue({ status: 'ok' });

    await checkBackendHealth();

    expect(request).toHaveBeenCalledWith('/health', {
      auth: false,
      timeoutMs: STARTUP_CHECK_TIMEOUT_MS,
    });
  });

  it('allows startup work to complete without waiting indefinitely', async () => {
    await expect(withStartupTimeout(Promise.resolve('ready'), 50)).resolves.toBe('ready');
    await expect(withStartupTimeout(new Promise(() => {}), 5)).rejects.toThrow(
      'startup-timeout',
    );
  });
});
