import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { downloadAndShare, ReportKind } from '../features/reports/download';
import { Button, Notice, ScreenContainer, ScreenHeader, SectionHeader } from '../components/ui';
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

  const btn = (kind: ReportKind, label: string, icon: 'document-text-outline' | 'grid-outline') => (
    <View style={s.flex}>
      <Button
        label={label}
        icon={icon}
        variant="secondary"
        loading={busy === kind}
        disabled={!!busy && busy !== kind}
        onPress={() => run(kind)}
      />
    </View>
  );

  return (
    <ScreenContainer scroll>
      <ScreenHeader
        title="Rapports"
        subtitle="Générés par le serveur, puis partageables"
      />

      <SectionHeader title="Ventes" />
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
      <View style={s.buttons}>
        {btn('sales-excel', 'Excel', 'grid-outline')}
        {btn('sales-pdf', 'PDF', 'document-text-outline')}
      </View>

      <SectionHeader title="Stock" />
      <Text style={s.caption}>État du stock à ce jour, sans période.</Text>
      <View style={[s.buttons, s.top]}>
        {btn('inventory-excel', 'Excel', 'grid-outline')}
        {btn('inventory-pdf', 'PDF', 'document-text-outline')}
      </View>

      {error ? <Notice>{error}</Notice> : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  caption: { fontSize: 13, color: colors.textMuted },
  top: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextOn: { color: '#FFFFFF' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
