import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getReturn } from '../features/returns/api';
import { listAllVariants } from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, returnConditionLabel, returnStatusLabel } from '../lib/format';
import { colors, spacing } from '../theme/colors';

export default function ReturnDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const ret = useQuery({
    queryKey: ['return', id],
    queryFn: () => getReturn(id),
    enabled: !!id,
  });
  const variants = useQuery({ queryKey: ['variants', 'all'], queryFn: listAllVariants });

  const names = new Map((variants.data?.data ?? []).map((v) => [v.id, v.name]));
  const d = ret.data;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Link href="/returns" style={s.back}>‹ Retours</Link>
      <Text style={s.title}>Reçu de retour</Text>

      {ret.isLoading && <ActivityIndicator color={colors.primary} />}
      {ret.error && <Text style={s.error}>{userMessage(ret.error)}</Text>}

      {d && (
        <>
          <Text style={s.muted}>
            {formatDateTime(d.createdAt)} · {returnStatusLabel(d.status)}
          </Text>
          {d.reason && <Text style={s.muted}>Motif : {d.reason}</Text>}
          <Link href={{ pathname: '/sale', params: { id: d.saleId } }} style={s.link}>
            Voir la vente d'origine
          </Link>

          <Text style={s.section}>Articles ({d.items.length})</Text>
          {d.items.map((it) => (
            <View key={it.id} style={s.line}>
              <View style={s.flex}>
                <Text style={s.name}>
                  {names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                </Text>
                <Text style={s.muted}>
                  {formatMoney(it.unitPrice)} × {it.quantity} ·{' '}
                  {returnConditionLabel(it.condition)}
                </Text>
              </View>
              <Text style={s.lineTotal}>
                {formatMoney(new Decimal(it.unitPrice).times(it.quantity).toFixed(2))}
              </Text>
            </View>
          ))}

          <View style={s.totals}>
            <View style={s.row}>
              <Text style={s.totalLabel}>Total retourné</Text>
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
  link: { color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
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