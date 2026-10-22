
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';

import {
  getSale,
  listAllVariants,
} from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import {
  formatDateTime,
  saleStatusLabel,
} from '../lib/format';
import { colors, spacing } from '../theme/colors';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const sale = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSale(id),
    enabled: !!id,
  });

  const variants = useQuery({
    queryKey: ['variants', 'all'],
    queryFn: listAllVariants,
  });

  const names = new Map(
    (variants.data?.data ?? []).map((v) => [v.id, v.name]),
  );

  const d = sale.data;
  const hasDiscount = d
    ? !new Decimal(d.discount).isZero()
    : false;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Link href="/sales" style={s.back}>
        ‹ Ventes
      </Link>

      <Text style={s.title}>Reçu de vente</Text>

      {sale.isLoading && (
        <ActivityIndicator color={colors.primary} />
      )}

      {sale.error && (
        <Text style={s.error}>
          {userMessage(sale.error)}
        </Text>
      )}

      {d && (
        <>
          <Text style={s.muted}>
            {formatDateTime(d.createdAt)} ·{' '}
            {saleStatusLabel(d.status)}
          </Text>

                   {d.status === 'COMPLETED' && (
            <Link
              href={{ pathname: '/return-new', params: { saleId: d.id } }}
              style={{ color: colors.accent, fontWeight: '700', marginTop: spacing.md }}
            >
              ↩ Retourner des articles
            </Link>
          )}
          <Text style={s.section}>Articles ({d.items.length})</Text>
          {d.items.map((it) => (
            <View key={it.id} style={s.line}>
              <View style={s.flex}>
                <Text style={s.name}>
                  {names.get(it.variantId) ??
                    `Article ${it.variantId.slice(0, 8)}`}
                </Text>

                <Text style={s.muted}>
                  {formatMoney(it.unitPrice)} × {it.quantity}
                </Text>
              </View>

              <Text style={s.lineTotal}>
                {formatMoney(
                  new Decimal(it.unitPrice)
                    .times(it.quantity)
                    .toFixed(2),
                )}
              </Text>
            </View>
          ))}

          <View style={s.totals}>
            <View style={s.row}>
              <Text style={s.muted}>Sous-total</Text>
              <Text style={s.value}>
                {formatMoney(d.subtotal)}
              </Text>
            </View>

            {hasDiscount && (
              <View style={s.row}>
                <Text style={s.muted}>Remise</Text>
                <Text style={s.value}>
                  − {formatMoney(d.discount)}
                </Text>
              </View>
            )}

            <View style={s.row}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>
                {formatMoney(d.total)}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    backgroundColor: colors.background,
    flexGrow: 1,
  },

  back: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },

  muted: {
    color: colors.textMuted,
  },

  section: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
  },

  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  lineTotal: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  totals: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },

  value: {
    color: colors.text,
    fontSize: 16,
  },

  totalLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  totalValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
});
