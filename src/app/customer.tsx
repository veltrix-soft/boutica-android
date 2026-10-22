import {
  View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getCustomer } from '../features/customers/api';
import { listSales } from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, saleStatusLabel } from '../lib/format';
import { colors, spacing } from '../theme/colors';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });

  const history = useInfiniteQuery({
    queryKey: ['sales', 'customer', id],
    queryFn: ({ pageParam }) => listSales(pageParam, id),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: !!id,
    refetchOnMount: 'always',
  });

  const sales = history.data?.pages.flatMap((p) => p.data) ?? [];
  const count = history.data?.pages[0]?.total ?? 0;
  const allLoaded = !!history.data && !history.hasNextPage;
  const spent = sales
    .filter((x) => x.status === 'COMPLETED')
    .reduce((sum, x) => sum.plus(x.total), new Decimal(0));
  const c = customer.data;
  const error = customer.error ?? history.error;

  return (
    <View style={s.container}>
      <Link href="/customers" style={s.back}>‹ Clients</Link>

      <FlatList
        data={sales}
        keyExtractor={(x) => x.id}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching && !history.isFetchingNextPage}
            onRefresh={() => { customer.refetch(); history.refetch(); }}
          />
        }
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {customer.isLoading && <ActivityIndicator color={colors.primary} />}
            {c && (
              <>
                <Text style={s.title}>{c.name}</Text>
                {c.phone && <Text style={s.muted}>{c.phone}</Text>}
              </>
            )}
            {error && <Text style={s.error}>{userMessage(error)}</Text>}
            {history.data && (
              <View style={s.summary}>
                <Text style={s.muted}>{count} achat(s)</Text>
                {allLoaded && (
                  <Text style={s.spent}>Total des achats : {formatMoney(spent.toFixed(2))}</Text>
                )}
              </View>
            )}
            <Text style={s.section}>Historique des ventes</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/sale', params: { id: item.id } }} asChild>
            <Pressable style={s.card} accessibilityRole="button">
              <View style={s.flex}>
                <Text style={s.date}>{formatDateTime(item.createdAt)}</Text>
                <Text style={s.muted}>{saleStatusLabel(item.status)}</Text>
              </View>
              <Text style={s.amount}>{formatMoney(item.total)}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !history.isLoading && !error ? (
            <Text style={s.empty}>Aucune vente pour ce client.</Text>
          ) : null
        }
        ListFooterComponent={
          history.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl * 2,
    backgroundColor: colors.background },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textMuted },
  summary: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  spent: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.xs },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  date: { color: colors.text, fontSize: 15, fontWeight: '600' },
  amount: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});