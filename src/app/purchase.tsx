import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { default as Decimal } from 'decimal.js';
import { getPurchase } from '../features/purchases/api';
import { listAllVariants } from '../features/sales/api';
import { listSupplierOptions } from '../features/suppliers/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, purchaseStatusLabel } from '../lib/format';
import {
  ErrorState, ListItem, LoadingState, ScreenContainer, ScreenHeader,
  SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const purchase = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
  const variants = useQuery({ queryKey: ['variants', 'all'], queryFn: listAllVariants });
  const d = purchase.data;
  const suppliers = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: listSupplierOptions,
    enabled: !!d?.supplierId,
  });

  const names = new Map((variants.data?.data ?? []).map((v) => [v.id, v.name]));
  const supplierName = d?.supplierId
    ? suppliers.data?.data.find((x) => x.id === d.supplierId)?.name
    : undefined;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Reçu d'achat"
        subtitle={
          d
            ? [formatDateTime(d.createdAt), d.supplierId ? supplierName ?? 'Fournisseur non retrouvé' : null]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        right={
          d ? (
            <StatusBadge
              label={purchaseStatusLabel(d.status)}
              tone={d.status === 'RECEIVED' ? 'success' : d.status === 'CANCELLED' ? 'danger' : 'neutral'}
            />
          ) : undefined
        }
      />
      {purchase.isLoading ? (
        <LoadingState />
      ) : purchase.error ? (
        <ErrorState message={userMessage(purchase.error)} onRetry={() => purchase.refetch()} />
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
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{formatMoney(d.total)}</Text>
          </View>
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  list: { gap: spacing.sm },
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginTop: spacing.md },
  totalLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '700', color: colors.primary,
    fontVariant: ['tabular-nums'] },
});
