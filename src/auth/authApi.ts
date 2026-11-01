import { API_URL } from '../config';
import { request } from '../api/client';
import { ApiError } from '../api/errors';
import { clearToken, saveToken } from './tokenStorage';

const SIGN_UP_TIMEOUT_MS = 90_000;

export type AuthUser = {
  id: string;
  businessId: string;
  role: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
};

type AuthResponse = { token: string; user: AuthUser };

async function handleAuth(
  path: string,
  body: unknown,
  timeoutMs?: number,
): Promise<AuthUser> {
  let res: AuthResponse;

  try {
    res = await request<AuthResponse>(path, {
      method: 'POST',
      body,
      auth: false,
      ...(timeoutMs ? { timeoutMs } : {}),
    });
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'unauthorized') {
      throw new ApiError(
        'validation',
        'Email ou mot de passe incorrect.',
        e.status,
      );
    }

    throw e;
  }

  if (!res?.token || !res?.user) {
    throw new ApiError('unknown', 'Réponse inattendue du serveur.');
  }

  await saveToken(res.token);

  return res.user;
}

export const signIn = (email: string, password: string) =>
  handleAuth('/api/auth/sign-in/email', { email, password });

export const signUp = (input: {
  name: string;
  email: string;
  password: string;
  businessName: string;
}) =>
  handleAuth('/api/auth/sign-up/email', input, SIGN_UP_TIMEOUT_MS);

export async function getCurrentUser(): Promise<AuthUser> {
  const session = await request<{ user: AuthUser } | null>('/api/auth/get-session');

  if (!session?.user) {
    throw new ApiError('unauthorized', 'Session expirée. Reconnectez-vous.');
  }

  return session.user;
}

export async function updateName(name: string): Promise<void> {
  await request('/api/auth/update-user', {
    method: 'POST',
    body: { name },
  });
}

export async function requestEmailChange(newEmail: string): Promise<void> {
  await request('/api/auth/change-email', {
    method: 'POST',
    body: { newEmail, callbackURL: 'bouticaandroid://settings' },
  });
}

export async function sendEmailVerification(email: string): Promise<void> {
  await request('/api/auth/send-verification-email', {
    method: 'POST',
    body: { email, callbackURL: 'bouticaandroid://settings' },
  });
}

export const requestPasswordReset = (email: string) =>
  request('/api/auth/request-password-reset', {
    method: 'POST',
    body: {
      email,
      redirectTo: new URL('/reset-password', API_URL).toString(),
    },
    auth: false,
  });

export async function signOut(): Promise<void> {
  try {
    await request('/api/auth/sign-out', {
      method: 'POST',
      body: {},
    });
  } finally {
    // Même si le serveur ne répond pas, on efface le badge sur le téléphone
    await clearToken();
  }
}