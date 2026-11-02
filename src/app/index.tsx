import { useEffect, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ApiError, userMessage } from '../api/errors';
import { StartupSplashScreen } from '../components/startup-splash-screen';
import { useAuth } from '../auth/AuthContext';
import { hasCompletedOnboarding } from '../features/onboarding/onboarding-storage';
import {
  checkBackendHealth,
  getSignedOutStartupRoute,
  withStartupTimeout,
} from '../features/startup/startup-service';

export default function StartupScreen() {
  const { status, refreshUser } = useAuth();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Préparation de Boutica…');
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<Href | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    let active = true;

    async function initialize() {
      setError(null);
      setDestination(null);

      let nextRoute: Href;
      try {
        if (status === 'signedIn') {
          nextRoute = '/(tabs)';
        } else {
          setStatusMessage('Préparation de votre espace…');
          nextRoute = getSignedOutStartupRoute(
            await withStartupTimeout(hasCompletedOnboarding()),
          );
        }
      } catch (storageError) {
        console.error('Unable to read onboarding completion state:', storageError);
        if (active) {
          setStatusMessage('Vérification de vos préférences…');
          setError(
            'Impossible de lire la progression enregistrée sur ce téléphone. Réessayez pour continuer.',
          );
        }
        return;
      }

      if (!active) return;
      setDestination(nextRoute);
      setStatusMessage('Connexion à Boutica Cloud…');

      try {
        await checkBackendHealth();
      } catch (healthError) {
        if (active) {
          const networkMessage = userMessage(healthError);
          const sessionMessage =
            status === 'signedIn'
              ? 'Votre session enregistrée est conservée. '
              : '';
          setError(
            `Boutica Cloud est temporairement indisponible. ${sessionMessage}${networkMessage} Vous pouvez continuer et réessayer plus tard.`,
          );
        }
        return;
      }

      if (status === 'signedIn') {
        setStatusMessage('Vérification de votre session…');
        try {
          await withStartupTimeout(refreshUser());
        } catch (sessionError) {
          if (!active) return;
          if (sessionError instanceof ApiError && sessionError.kind === 'unauthorized') {
            return;
          }

          setError(
            sessionError instanceof Error && sessionError.message === 'startup-timeout'
              ? 'La vérification de votre session prend trop de temps. Votre session reste enregistrée et vous pouvez continuer.'
              : `La session ne peut pas être vérifiée pour le moment. Votre session reste enregistrée. ${userMessage(sessionError)}`,
          );
          return;
        }
      }

      if (active) router.replace(nextRoute);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [attempt, refreshUser, router, status]);

  return (
    <StartupSplashScreen
      statusMessage={statusMessage}
      error={error}
      onContinue={destination ? () => router.replace(destination) : undefined}
      onRetry={error ? () => setAttempt((current) => current + 1) : undefined}
    />
  );
}
