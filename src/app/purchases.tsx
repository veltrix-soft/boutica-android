import {
  View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listPurchases } from '../features/purchases/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, purchaseStatusLabel } from '../lib/format';
import { colors, spacing } from '../theme/colors';

export default function PurchasesScreen() {
  const q = useInfiniteQuery({
    queryKey: ['purchases'],
    queryFn: ({ pageParam }) => listPurchases(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    refetchOnMount: 'always',
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <View style={s.container}>
      <Link href="/" style={s.back}>‹ Retour</Link>
      <Text style={s.title}>Achats</Text>
      <Link href="/purchase-new" style={s.add}>+ Réception d'achat</Link>
      {q.data && <Text style={s.muted}>{total} achat(s)</Text>}

      {q.isLoading && <ActivityIndicator color={colors.primary} style={s.gap} />}
      {q.error && <Text style={s.error}>{userMessage(q.error)}</Text>}

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching && !q.isFetchingNextPage}
            onRefresh={() => q.refetch()}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/purchase', params: { id: item.id } }} asChild>
            <Pressable style={s.card} accessibilityRole="button">
              <View style={s.flex}>
                <Text style={s.date}>{formatDateTime(item.createdAt)}</Text>
                <Text style={s.status}>{purchaseStatusLabel(item.status)}</Text>
              </View>
              <Text style={s.amount}>{formatMoney(item.total)}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <Text style={s.empty}>Aucun achat pour le moment.</Text>
          ) : null
        }
        ListFooterComponent={
          q.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
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
  add: { color: colors.primary, fontWeight: '700', marginVertical: spacing.sm },
  muted: { color: colors.textMuted },
  gap: { marginTop: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  date: { color: colors.text, fontSize: 15, fontWeight: '600' },
  status: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  amount: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});