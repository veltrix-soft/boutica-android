import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { IconName } from '../../components/ui';

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    const iconColor = typeof color === 'number' ? colors.textMuted : color ?? colors.textMuted;

    return (
      <Ionicons
        name={focused ? focusedName : name}
        size={22}
        color={iconColor}
      />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="sales" options={{ title: 'Ventes', tabBarIcon: icon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="products" options={{ title: 'Produits', tabBarIcon: icon('cube-outline', 'cube') }} />
      <Tabs.Screen name="purchases" options={{ title: 'Achats', tabBarIcon: icon('download-outline', 'download') }} />
      <Tabs.Screen name="more" options={{ title: 'Plus', tabBarIcon: icon('grid-outline', 'grid') }} />
    </Tabs>
  );
}