
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: false },
  },
});

function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
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
                <Stack.Screen name="(tabs)" />
        <Stack.Screen name="purchase" />
                <Stack.Screen name="expenses" />
        <Stack.Screen name="expense-new" />
                <Stack.Screen name="returns" />
        <Stack.Screen name="return" />
        <Stack.Screen name="return-new" />
                <Stack.Screen name="reports" />
                        <Stack.Screen name="settings" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
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
