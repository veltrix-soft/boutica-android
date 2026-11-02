import { NativeTabs } from 'expo-router/native-tabs';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      tintColor={colors.primary}
      labelStyle={{ color: colors.textMuted }}
      indicatorColor={colors.alertBg}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home_filled' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sales">
        <NativeTabs.Trigger.Label>Ventes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'receipt', selected: 'receipt.fill' }}
          md={{ default: 'receipt_long', selected: 'receipt_long' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <NativeTabs.Trigger.Label>Produits</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cube.box', selected: 'cube.box.fill' }}
          md={{ default: 'inventory_2', selected: 'inventory_2' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="purchases">
        <NativeTabs.Trigger.Label>Achats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }}
          md={{ default: 'shopping_bag', selected: 'shopping_bag' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>Plus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'ellipsis', selected: 'ellipsis' }}
          md={{ default: 'more_horiz', selected: 'more_horiz' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}