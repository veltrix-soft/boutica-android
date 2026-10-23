import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getReturn } from '../features/returns/api';
import { listAllVariants } from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, returnConditionLabel, returnStatusLabel } from '../lib/format';
import {
  Button, ErrorState, ListItem, LoadingState, Notice, ScreenContainer,
  ScreenHeader, SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

export default function ReturnDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const ret = useQuery({
    queryKey: ['return', id],
    queryFn: () => getReturn(id),
    enabled: !!id,
  });
  const variants = useQuery({ queryKey: ['variants', 'all'], queryFn: listAllVariants });

  const names = new Map((variants.data?.data ?? []).map((v) => [v.id, v.name]));
  const d = ret.data;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Reçu de retour"
        subtitle={d ? formatDateTime(d.createdAt) : undefined}
        right={
          d ? (
            <StatusBadge
              label={returnStatusLabel(d.status)}
              tone={d.status === 'COMPLETED' ? 'success' : 'neutral'}
            />
          ) : undefined
        }
      />
      {ret.isLoading ? (
        <LoadingState />
      ) : ret.error ? (
        <ErrorState message={userMessage(ret.error)} onRetry={() => ret.refetch()} />
      ) : d ? (
        <ScrollView contentContainerStyle={s.content}>
          {d.reason ? <Notice tone="warning">Motif : {d.reason}</Notice> : null}
          <SectionHeader title={`Articles (${d.items.length})`} />
          <View style={s.list}>
            {d.items.map((it) => (
              <ListItem
                key={it.id}
                title={names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                subtitle={`${formatMoney(it.unitPrice)} × ${it.quantity}`}
                meta={formatMoney(new Decimal(it.unitPrice).times(it.quantity).toFixed(2))}
                badge={
                  <StatusBadge
                    label={returnConditionLabel(it.condition)}
                    tone={it.condition === 'DAMAGED' ? 'warning' : 'neutral'}
                  />
                }
              />
            ))}
          </View>
          <View style={s.totals}>
            <Text style={s.totalLabel}>Total retourné</Text>
            <Text style={s.totalValue}>{formatMoney(d.total)}</Text>
          </View>
          <View style={s.action}>
            <Button
              label="Voir la vente d'origine"
              variant="secondary"
              icon="receipt-outline"
              onPress={() => router.push({ pathname: '/sale', params: { id: d.saleId } })}
            />
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
  action: { marginTop: spacing.lg },
});