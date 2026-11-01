import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { request } from './client';

jest.mock('../auth/tokenStorage', () => ({
  getToken: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
}));

describe('request timeout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('times out even if reading a response body ignores abort', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
      Promise.resolve({
        ok: true,
        text: () => new Promise<string>(() => undefined),
      } as Response),
    );

    await expect(
      request('/api/test', { auth: false, timeoutMs: 10 }),
    ).rejects.toMatchObject({
      kind: 'timeout',
    });
  });
});
