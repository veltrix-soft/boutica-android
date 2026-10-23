import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  IconName, ListItem, ScreenContainer, ScreenHeader, SectionHeader,
} from '../../components/ui';
import { spacing } from '../../theme/colors';

const GROUPS: { title: string; items: { label: string; icon: IconName; href: string }[] }[] = [
  {
    title: 'Contacts',
    items: [
      { label: 'Clients', icon: 'people-outline', href: '/customers' },
      { label: 'Fournisseurs', icon: 'business-outline', href: '/suppliers' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { label: 'Dépenses', icon: 'wallet-outline', href: '/expenses' },
      { label: 'Retours', icon: 'arrow-undo-outline', href: '/returns' },
      { label: 'Rapports', icon: 'document-text-outline', href: '/reports' },
    ],
  },
  {
    title: 'Application',
    items: [{ label: 'Paramètres', icon: 'settings-outline', href: '/settings' }],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  return (
    <ScreenContainer scroll bottomInset={false}>
      <ScreenHeader back={false} title="Plus" />
      {GROUPS.map((g) => (
        <View key={g.title}>
          <SectionHeader title={g.title} />
          <View style={s.list}>
            {g.items.map((it) => (
              <ListItem
                key={it.label}
                icon={it.icon}
                title={it.label}
                onPress={() => router.push(it.href as any)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  list: { gap: spacing.sm },
});