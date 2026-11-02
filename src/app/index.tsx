import { useEffect, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ApiError } from '../api/errors';
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

      // Navigation immédiate pour éviter l'attente réseau au redémarrage.
      router.replace(nextRoute);

      // Vérifications réseau en arrière-plan (non bloquantes).
      void (async () => {
        try {
          await checkBackendHealth();
        } catch (healthError) {
          console.error('Boutica Cloud indisponible au démarrage:', healthError);
        }

        if (status === 'signedIn') {
          try {
            await withStartupTimeout(refreshUser());
          } catch (sessionError) {
            if (sessionError instanceof ApiError && sessionError.kind === 'unauthorized') {
              return;
            }
            console.error('Vérification de session échouée au démarrage:', sessionError);
          }
        }
      })();
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

