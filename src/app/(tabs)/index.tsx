import { Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { request } from '../../api/client';
import { userMessage } from '../../api/errors';
import { formatMoney, toDecimal } from '../../lib/money';
import { formatDateTime } from '../../lib/format';
import {
  Button, ErrorState, ListItem, LoadingState, MetricCard, Notice,
  ScreenContainer, SectionHeader, StatusBadge,
} from '../../components/ui';
import { colors, spacing } from '../../theme/colors';

type Dashboard = {
  period: { from: string; to: string };
  revenue: string;
  expensesTotal: string;
  estimatedProfit: string;
  stockValue: string;
  receivables: string | null;
  recentSales: { id: string; total: string; customerId: string | null; createdAt: string }[];
  topProducts: {
    variantId: string; productName: string; variantName: string;
    sku: string; quantitySold: number;
  }[];
  lowStockAlerts: { variantId: string; quantity: number; variantName: string; sku: string }[];
};

const shortDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const metricCellStyle = width >= 960 ? s.cellWide : s.cell;

  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => request<Dashboard>('/api/v1/reports/dashboard'),
  });

  const d = dash.data;
  const profit = d ? toDecimal(d.estimatedProfit) : null;
  const profitTone = !profit || profit.isZero() ? 'default' : profit.isNegative() ? 'danger' : 'success';

  return (
    <ScreenContainer
      scroll
      bottomInset={false}
      refreshControl={
        <RefreshControl
          refreshing={dash.isRefetching}
          onRefresh={async () => {
            await dash.refetch();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <View style={s.headerBrand}>
          <Text style={s.brand}>Boutica</Text>
          <Text style={s.caption} numberOfLines={1}>
            {user?.name ? `Bonjour, ${user.name}` : 'Bonjour'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={8}
          style={s.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={[s.actions, width < 360 && s.actionsStacked]}>
        <View style={s.flex}>
          <Button label="Nouvelle vente" icon="cart-outline" onPress={() => router.push('/sale-new')} />
        </View>
        <View style={s.flex}>
          <Button
            label="Réception"
            accessibilityLabel="Réception d'achat"
            icon="download-outline"
            variant="secondary"
            onPress={() => router.push('/purchase-new')}
          />
        </View>
      </View>

      {dash.isLoading ? <LoadingState /> : null}
      {dash.error && !d ? (
        <ErrorState message={userMessage(dash.error)} onRetry={() => dash.refetch()} />
      ) : null}
      {dash.error && d ? (
        <Notice>{userMessage(dash.error)} Les chiffres affichés peuvent ne pas être à jour.</Notice>
      ) : null}

      {d ? (
        <>
          <View style={s.revenueCard}>
            <View style={s.revenueTop}>
              <View style={s.revenueIcon}>
                <Ionicons name="trending-up-outline" size={21} color="#FFFFFF" />
              </View>
              <View style={s.periodChip}>
                <Ionicons name="calendar-outline" size={14} color="#FCEAEC" />
                <Text style={s.period}>
                  Du {shortDate(d.period.from)} au {shortDate(d.period.to)}
                </Text>
              </View>
            </View>
            <Text style={s.revenueLabel}>CHIFFRE D&apos;AFFAIRES</Text>
            <Text style={s.revenueValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(d.revenue)}
            </Text>
            <View style={s.revenueHintRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#FCEAEC" />
              <Text style={s.revenueHint}>Ventes terminées sur la période</Text>
            </View>
          </View>

          <View style={s.grid}>
            <MetricCard
              label="Bénéfice estimé"
              value={formatMoney(d.estimatedProfit)}
              tone={profitTone}
              style={metricCellStyle}
            />
            <MetricCard label="Dépenses" value={formatMoney(d.expensesTotal)} style={metricCellStyle} />
            <MetricCard label="Valeur du stock" value={formatMoney(d.stockValue)} style={metricCellStyle} />
            <MetricCard
              label="Créances"
              value={formatMoney(d.receivables)}
              hint={d.receivables === null ? 'Non disponible' : undefined}
              style={metricCellStyle}
            />
          </View>

          <SectionHeader
            title={`Stock faible${d.lowStockAlerts.length ? ` (${d.lowStockAlerts.length})` : ''}`}
            actionLabel="Produits"
            onAction={() => router.push('/products')}
          />
          {d.lowStockAlerts.length === 0 ? (
            <Notice tone="success">Aucun article en stock faible.</Notice>
          ) : (
            <View style={s.list}>
              {d.lowStockAlerts.slice(0, 5).map((a) => (
                <ListItem
                  key={a.variantId}
                  icon="alert-circle-outline"
                  title={a.variantName}
                  subtitle={`SKU ${a.sku}`}
                  meta={String(a.quantity)}
                  metaSub="en stock"
                  badge={
                    <StatusBadge
                      label={a.quantity === 0 ? 'Rupture' : 'Stock faible'}
                      tone={a.quantity === 0 ? 'danger' : 'warning'}
                    />
                  }
                />
              ))}
              {d.lowStockAlerts.length > 5 ? (
                <Text style={s.more}>+ {d.lowStockAlerts.length - 5} autre(s) article(s)</Text>
              ) : null}
            </View>
          )}

          <SectionHeader
            title="Ventes récentes"
            actionLabel="Tout voir"
            onAction={() => router.push('/sales')}
          />
          {d.recentSales.length === 0 ? (
            <Text style={s.empty}>Aucune vente pour le moment.</Text>
          ) : (
            <View style={s.list}>
              {d.recentSales.slice(0, 5).map((x) => (
                <ListItem
                  key={x.id}
                  icon="receipt-outline"
                  title={formatDateTime(x.createdAt)}
                  subtitle={x.customerId ? 'Client enregistré' : 'Sans client'}
                  meta={formatMoney(x.total)}
                  onPress={() => router.push({ pathname: '/sale', params: { id: x.id } })}
                />
              ))}
            </View>
          )}

          <SectionHeader title="Produits les plus vendus" />
          {d.topProducts.length === 0 ? (
            <Text style={s.empty}>Pas encore de ventes sur la période.</Text>
          ) : (
            <View style={s.list}>
              {d.topProducts.map((p) => (
                <ListItem
                  key={p.variantId}
                  icon="trophy-outline"
                  title={p.productName}
                  subtitle={`${p.variantName} · SKU ${p.sku}`}
                  meta={String(p.quantitySold)}
                  metaSub="vendus"
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  headerBrand: { flex: 1, minWidth: 0 },
  brand: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: 0.2 },
  caption: { fontSize: 13, color: colors.textMuted },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  actionsStacked: { flexDirection: 'column' },
  revenueCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  revenueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  revenueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B7353D',
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryPressed,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    flexShrink: 1,
  },
  period: { fontSize: 11, color: '#FCEAEC', flexShrink: 1 },
  revenueLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: '#FCEAEC', marginTop: spacing.md },
  revenueValue: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: '#FFFFFF', marginTop: spacing.xs },
  revenueHintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  revenueHint: { fontSize: 13, color: '#FCEAEC' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  cell: { flexGrow: 1, flexBasis: '47%' },
  cellWide: { flexGrow: 1, flexBasis: '22%' },
  list: { gap: spacing.sm },
  more: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  empty: { fontSize: 14, color: colors.textMuted },
});
