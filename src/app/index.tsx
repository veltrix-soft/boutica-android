import { useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { request } from '../api/client';
import { userMessage } from '../api/errors';
import { formatMoney, toDecimal } from '../lib/money';
import { colors, spacing } from '../theme/colors';

type Dashboard = {
  period: { from: string; to: string };
  revenue: string;
  expensesTotal: string;
  estimatedProfit: string;
  stockValue: string;
  receivables: string | null;
  recentSales: unknown[];
  topProducts: unknown[];
  lowStockAlerts: unknown[];
};

const shortDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const MENU: { label: string; href: string }[] = [
  { label: 'Ventes', href: '/sales' },
  { label: 'Achats', href: '/purchases' },
  { label: 'Produits', href: '/products' },
  { label: 'Clients', href: '/customers' },
  { label: 'Fournisseurs', href: '/suppliers' },
  { label: 'Dépenses', href: '/expenses' },
  { label: 'Retours', href: '/returns' },
    { label: 'Rapports', href: '/reports' },
  { label: 'Paramètres', href: '/settings' },
];

function Card({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => request<Dashboard>('/api/v1/reports/dashboard'),
  });

  async function onSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  const d = dash.data;
  const profitNegative = d ? toDecimal(d.estimatedProfit)?.isNegative() : false;

  return (
    <ScrollView
      contentContainerStyle={s.container}
      refreshControl={
        <RefreshControl refreshing={dash.isRefetching} onRefresh={() => dash.refetch()} />
      }
    >
      <Text style={s.title}>Boutica</Text>
      <Text style={s.muted}>
        {user?.name ? `Bonjour, ${user.name}` : 'Bonjour'}
        {d ? ` · du ${shortDate(d.period.from)} au ${shortDate(d.period.to)}` : ''}
      </Text>

      <View style={s.actions}>
        <Link href="/sale-new" asChild>
                  <Pressable style={StyleSheet.flatten([s.action, s.actionSale])} accessibilityRole="button">
            <Text style={s.actionText}>Nouvelle vente</Text>
          </Pressable>
        </Link>
        <Link href="/purchase-new" asChild>
                  <Pressable style={StyleSheet.flatten([s.action, s.actionBuy])} accessibilityRole="button">
            <Text style={s.actionText}>Réception d'achat</Text>
          </Pressable>
        </Link>
      </View>

      {dash.isLoading && <ActivityIndicator color={colors.primary} style={s.gap} />}
      {dash.error && (
        <View style={s.gap}>
          <Text style={s.error}>{userMessage(dash.error)}</Text>
          <Pressable style={s.retry} onPress={() => dash.refetch()}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {d && (
        <View style={s.gap}>
          <Card label="Chiffre d'affaires" value={formatMoney(d.revenue)} />
          <Card label="Dépenses" value={formatMoney(d.expensesTotal)} />
          <Card
            label="Bénéfice estimé"
            value={formatMoney(d.estimatedProfit)}
            tone={profitNegative ? colors.danger : colors.success}
          />
          <Card label="Valeur du stock" value={formatMoney(d.stockValue)} />
          <Card label="Créances" value={formatMoney(d.receivables)} />
          <Card
            label="Alertes de stock faible"
            value={d.lowStockAlerts.length === 0 ? 'Aucune' : String(d.lowStockAlerts.length)}
          />
        </View>
      )}

      <Text style={s.section}>Gérer</Text>
      <View style={s.grid}>
        {MENU.map((m) => (
          <Link key={m.label} href={m.href as any} asChild>
            <Pressable style={s.tile} accessibilityRole="button">
              <Text style={s.tileText}>{m.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable style={[s.logout, busy && s.disabled]} onPress={onSignOut}
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
  title: { fontSize: 30, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textMuted, marginBottom: spacing.md },
  gap: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1, borderRadius: 12, padding: spacing.md, minHeight: 64,
    alignItems: 'center', justifyContent: 'center' },
  actionSale: { backgroundColor: colors.primary },
  actionBuy: { backgroundColor: colors.accent },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.textMuted, fontSize: 14 },
  cardValue: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.xs },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg,
    marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', backgroundColor: colors.surface, borderRadius: 12,
    padding: spacing.md, minHeight: 64, justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border },
  tileText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, textAlign: 'center' },
  retry: { alignSelf: 'center', marginTop: spacing.sm, padding: spacing.sm },
  retryText: { color: colors.primary, fontWeight: '700' },
  logout: { backgroundColor: colors.textMuted, borderRadius: 8, padding: spacing.md,
    marginTop: spacing.xl, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});