
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { StartupSplashScreen } from '../components/startup-splash-screen';

SplashScreen.setOptions({ duration: 350, fade: true });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: false },
  },
});

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      ScreenOrientation.unlockAsync().catch((error: unknown) => {
        console.error('Unable to restore Android system orientation behavior:', error);
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const kind = response.notification.request.content.data?.kind;
      if (kind === 'low-stock' || kind === 'out-of-stock') {
        router.push('/(tabs)/products');
      } else if (kind === 'sale-created') {
        router.push('/(tabs)/sales');
      } else {
        router.push('/reminders');
      }
    });
    return () => subscription.remove();
  }, []);

  if (status === 'loading') {
    return (
      <StartupSplashScreen
        statusMessage="Restauration de votre session…"
      />
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product-new" />
        <Stack.Screen name="product" />
        <Stack.Screen name="variant-new" />
        <Stack.Screen name="stock-adjust" />
        <Stack.Screen name="sale-new" />
        <Stack.Screen name="sale" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="customer-new" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="suppliers" />
        <Stack.Screen name="supplier-new" />
        <Stack.Screen name="purchase-new" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="expenses" />
        <Stack.Screen name="expense-new" />
        <Stack.Screen name="returns" />
        <Stack.Screen name="return" />
        <Stack.Screen name="return-new" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="reminders" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

