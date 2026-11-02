import { request } from '../../api/client';

export const STARTUP_CHECK_TIMEOUT_MS = 5000;

export type SignedOutStartupRoute = '/welcome' | '/login';

export function getSignedOutStartupRoute(
  onboardingCompleted: boolean,
): SignedOutStartupRoute {
  return onboardingCompleted ? '/login' : '/welcome';
}

export async function checkBackendHealth(): Promise<void> {
  await request('/health', {
    auth: false,
    timeoutMs: STARTUP_CHECK_TIMEOUT_MS,
  });
}

export function withStartupTimeout<T>(
  task: Promise<T>,
  timeoutMs = STARTUP_CHECK_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('startup-timeout')), timeoutMs);
  });

  return Promise.race([task, deadline]).finally(() => {
    if (timeout !== undefined) clearTimeout(timeout);
  });
}
