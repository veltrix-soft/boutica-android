import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { default as Decimal } from 'decimal.js';
import { getSale, listAllVariants } from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, saleStatusLabel } from '../lib/format';
import {
  Button, ErrorState, ListItem, LoadingState, ScreenContainer, ScreenHeader,
  SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={strong ? s.totalLabel : s.caption}>{label}</Text>
      <Text style={strong ? s.totalValue : s.value}>{value}</Text>
    </View>
  );
}

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const sale = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSale(id),
    enabled: !!id,
  });
  const variants = useQuery({
    queryKey: ['variants', 'all'],
    queryFn: listAllVariants,
  });

  const names = new Map((variants.data?.data ?? []).map((v) => [v.id, v.name]));
  const d = sale.data;
  const hasDiscount = d ? !new Decimal(d.discount).isZero() : false;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Reçu de vente"
        subtitle={d ? formatDateTime(d.createdAt) : undefined}
        right={
          d ? (
            <StatusBadge
              label={saleStatusLabel(d.status)}
              tone={d.status === 'COMPLETED' ? 'success' : d.status === 'CANCELLED' ? 'danger' : 'neutral'}
            />
          ) : undefined
        }
      />
      {sale.isLoading ? (
        <LoadingState />
      ) : sale.error ? (
        <ErrorState message={userMessage(sale.error)} onRetry={() => sale.refetch()} />
      ) : d ? (
        <ScrollView contentContainerStyle={s.content}>
          <SectionHeader title={`Articles (${d.items.length})`} />
          <View style={s.list}>
            {d.items.map((it) => (
              <ListItem
                key={it.id}
                title={names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                subtitle={`${formatMoney(it.unitPrice)} × ${it.quantity}`}
                meta={formatMoney(new Decimal(it.unitPrice).times(it.quantity).toFixed(2))}
              />
            ))}
          </View>

          <View style={s.totals}>
            <Row label="Sous-total" value={formatMoney(d.subtotal)} />
            {hasDiscount ? <Row label="Remise" value={`− ${formatMoney(d.discount)}`} /> : null}
            <Row label="Total" value={formatMoney(d.total)} strong />
          </View>

          {d.status === 'COMPLETED' ? (
            <View style={s.action}>
              <Button
                label="Retourner des articles"
                variant="secondary"
                icon="arrow-undo-outline"
                onPress={() => router.push({ pathname: '/return-new', params: { saleId: d.id } })}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  list: { gap: spacing.sm },
  totals: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { fontSize: 14, color: colors.textMuted },
  value: { fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  totalLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '700', color: colors.primary,
    fontVariant: ['tabular-nums'] },
  action: { marginTop: spacing.lg },
});