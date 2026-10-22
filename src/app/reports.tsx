import { useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { downloadAndShare, ReportKind } from '../features/reports/download';
import { colors, spacing } from '../theme/colors';

type PeriodKey = 'month' | '7' | '30';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Ce mois-ci' },
  { key: '7', label: '7 derniers jours' },
  { key: '30', label: '30 derniers jours' },
];

function periodRange(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const from =
    key === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getTime() - Number(key) * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: now.toISOString() };
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: ReportKind) {
    if (busy) return; // un seul téléchargement à la fois
    setBusy(kind);
    setError(null);
    try {
      await downloadAndShare(kind, periodRange(period));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setBusy(null);
    }
  }

  function Btn({ kind, label }: { kind: ReportKind; label: string }) {
    const loading = busy === kind;
    return (
      <Pressable
        style={[s.button, !!busy && s.disabled]}
        onPress={() => run(kind)}
        disabled={!!busy}
        accessibilityRole="button"
      >
        {loading ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={s.buttonText}>{label}</Text>}
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Link href="/" style={s.back}>‹ Retour</Link>
      <Text style={s.title}>Rapports</Text>
      <Text style={s.muted}>
        Le fichier est généré par le serveur (quelques secondes), puis vous pouvez
        l'envoyer ou l'ouvrir avec une autre application.
      </Text>

      <Text style={s.section}>Ventes</Text>
      <View style={s.chips}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[s.chip, period === p.key && s.chipOn]}
            onPress={() => setPeriod(p.key)}
            accessibilityRole="button"
          >
            <Text style={[s.chipText, period === p.key && s.chipTextOn]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Btn kind="sales-excel" label="Ventes en Excel (.xlsx)" />
      <Btn kind="sales-pdf" label="Ventes en PDF" />

      <Text style={s.section}>Stock</Text>
      <Text style={s.muted}>L'état du stock à ce jour, sans période.</Text>
      <Btn kind="inventory-excel" label="Stock en Excel (.xlsx)" />
      <Btn kind="inventory-pdf" label="Stock en PDF" />

      {error && <Text style={s.error}>{error}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2,
    backgroundColor: colors.background, flexGrow: 1 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textMuted, marginTop: spacing.xs },
  section: { fontSize: 18, fontWeight: '700', color: colors.text,
    marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16,
    paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center',
    backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.lg },
});