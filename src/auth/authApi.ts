import { request } from '../api/client';
import { ApiError } from '../api/errors';
import { clearToken, saveToken } from './tokenStorage';

export type AuthUser = {
  id: string;
  businessId: string;
  role: string;
  name?: string;
  email?: string;
};

type AuthResponse = { token: string; user: AuthUser };

async function handleAuth(
  path: string,
  body: unknown,
): Promise<AuthUser> {
  let res: AuthResponse;

  try {
    res = await request<AuthResponse>(path, {
      method: 'POST',
      body,
      auth: false,
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
}) => handleAuth('/api/auth/sign-up/email', input);

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