import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../auth/AuthContext';
import { API_URL } from '../config';
import {
  Button, confirm, ScreenContainer, ScreenHeader, SectionHeader,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  function askSignOut() {
    if (busy) return;
    confirm({
      title: 'Se déconnecter ?',
      message: 'Vous devrez vous reconnecter pour utiliser Boutica.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await signOut();
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Paramètres" />

      <SectionHeader title="Compte" />
      <View style={s.card}>
        <Row label="Nom" value={user?.name ?? '—'} />
        <Row label="E-mail" value={user?.email ?? '—'} />
      </View>

      <SectionHeader title="Application" />
      <View style={s.card}>
        <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
        <Row label="Serveur" value={API_URL} />
        <Row label="Devise affichée" value="XOF" />
      </View>

      <View style={s.logout}>
        <Button label="Se déconnecter" variant="danger" icon="log-out-outline"
          onPress={askSignOut} loading={busy} />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  row: { gap: 2 },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 15, fontWeight: '600', color: colors.text },
  logout: { marginTop: spacing.xl },
});