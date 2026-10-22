import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getPurchase } from '../features/purchases/api';
import { listAllVariants } from '../features/sales/api';
import { listSupplierOptions } from '../features/suppliers/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, purchaseStatusLabel } from '../lib/format';
import { colors, spacing } from '../theme/colors';

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const purchase = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
  const variants = useQuery({
    queryKey: ['variants', 'all'],
    queryFn: listAllVariants,
  });
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
    <ScrollView contentContainerStyle={s.container}>
      <Link href="/purchases" style={s.back}>‹ Achats</Link>
      <Text style={s.title}>Reçu d'achat</Text>

      {purchase.isLoading && <ActivityIndicator color={colors.primary} />}
      {purchase.error && <Text style={s.error}>{userMessage(purchase.error)}</Text>}

      {d && (
        <>
          <Text style={s.muted}>
            {formatDateTime(d.createdAt)} · {purchaseStatusLabel(d.status)}
          </Text>
          {d.supplierId && (
            <Text style={s.muted}>
              Fournisseur : {supplierName ?? 'non retrouvé'}
            </Text>
          )}

          <Text style={s.section}>Articles ({d.items.length})</Text>
          {d.items.map((it) => (
            <View key={it.id} style={s.line}>
              <View style={s.flex}>
                <Text style={s.name}>
                  {names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                </Text>
                <Text style={s.muted}>
                  {formatMoney(it.unitPrice)} × {it.quantity}
                </Text>
              </View>
              <Text style={s.lineTotal}>
                {formatMoney(new Decimal(it.unitPrice).times(it.quantity).toFixed(2))}
              </Text>
            </View>
          ))}

          <View style={s.totals}>
            <View style={s.row}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{formatMoney(d.total)}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2,
    backgroundColor: colors.background, flexGrow: 1 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textMuted },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.md },
  line: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  lineTotal: { color: colors.text, fontSize: 16, fontWeight: '700' },
  totals: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  totalValue: { color: colors.primary, fontSize: 22, fontWeight: '700' },
});