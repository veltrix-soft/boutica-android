import { useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../auth/AuthContext';
import { API_URL } from '../config';
import { colors, spacing } from '../theme/colors';

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

  function confirmSignOut() {
    if (busy) return;
    Alert.alert('Se déconnecter ?', 'Vous devrez vous reconnecter pour utiliser Boutica.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Link href="/" style={s.back}>‹ Retour</Link>
      <Text style={s.title}>Paramètres</Text>

      <Text style={s.section}>Compte</Text>
      <View style={s.card}>
        <Row label="Nom" value={user?.name ?? '—'} />
        <Row label="E-mail" value={user?.email ?? '—'} />
      </View>

      <Text style={s.section}>Application</Text>
      <View style={s.card}>
        <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
        <Row label="Serveur" value={API_URL} />
        <Row label="Devise affichée" value="XOF" />
      </View>

      <Pressable style={[s.logout, busy && s.disabled]} onPress={confirmSignOut}
        disabled={busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={s.logoutText}>Se déconnecter</Text>}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2,
    backgroundColor: colors.background, flexGrow: 1 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  section: { fontSize: 18, fontWeight: '700', color: colors.text,
    marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border },
  row: { marginVertical: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13 },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  logout: { backgroundColor: colors.danger, borderRadius: 8, padding: spacing.md,
    marginTop: spacing.xl, minHeight: 48, alignItems: 'center',
    justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});