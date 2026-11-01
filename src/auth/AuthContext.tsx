import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  ReactNode,
} from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { ApiError } from '../api/errors';
import { signUp as signUpApi } from './authApi';
import * as authApi from './authApi';
import { clearToken, getToken } from './tokenStorage';
import { unregisterServerPushDevice } from '../features/reminders/push-alert-service';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthValue = {
  status: Status;
  user: authApi.AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: Parameters<typeof authApi.signUp>[0]) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  requestEmailChange: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<authApi.AuthUser | null>(null);

  // Au démarrage : y a-t-il un badge dans le coffre ?
  useEffect(() => {
    getToken()
      .then((t) => setStatus(t ? 'signedIn' : 'signedOut'))
      .catch(() => setStatus('signedOut'));
  }, []);

  // Si le serveur refuse le badge (session expirée), on revient à la connexion
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken().finally(() => {
        setUser(null);
        setStatus('signedOut');
      });
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await authApi.signIn(email, password);
    setUser(u);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(
    async (input: Parameters<typeof signUpApi>[0]) => {
      const u = await signUpApi(input);
      setUser(u);
      setStatus('signedIn');
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.getCurrentUser());
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthorized') {
        await clearToken();
        setUser(null);
        setStatus('signedOut');
      }

      throw error;
    }
  }, []);

  const updateName = useCallback(async (name: string) => {
    await authApi.updateName(name);
    setUser((currentUser) => currentUser ? { ...currentUser, name } : currentUser);
  }, []);

  const requestEmailChange = useCallback(
    (email: string) => authApi.requestEmailChange(email),
    [],
  );

  const userEmail = user?.email;
  const sendEmailVerification = useCallback(async () => {
    if (!userEmail) {
      throw new ApiError('validation', 'Aucune adresse e-mail n’est associée à ce compte.');
    }

    await authApi.sendEmailVerification(userEmail);
  }, [userEmail]);

  const signOut = useCallback(async () => {
    try {
      try {
        await unregisterServerPushDevice();
      } catch (error) {
        console.error('Unable to unregister server push notifications before sign-out:', error);
      }
      await authApi.signOut();
    } finally {
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      signIn,
      signUp,
      refreshUser,
      updateName,
      requestEmailChange,
      sendEmailVerification,
      signOut,
    }),
    [status, user, signIn, signUp, refreshUser, updateName, requestEmailChange, sendEmailVerification, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }

  return ctx;
}