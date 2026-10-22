import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listSuppliers } from '../features/suppliers/api';
import { userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

export default function SuppliersScreen() {
  const q = useInfiniteQuery({
    queryKey: ['suppliers'],
    queryFn: ({ pageParam }) => listSuppliers(pageParam),
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
      <Text style={s.title}>Fournisseurs</Text>
      <Link href="/supplier-new" style={s.add}>+ Nouveau fournisseur</Link>
      {q.data && <Text style={s.muted}>{total} fournisseur(s)</Text>}

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
          <View style={s.card}>
            <Text style={s.name}>{item.name}</Text>
            {item.phone && <Text style={s.muted}>{item.phone}</Text>}
          </View>
        )}
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <Text style={s.empty}>Aucun fournisseur pour le moment.</Text>
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
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl * 2,
    backgroundColor: colors.background },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  add: { color: colors.primary, fontWeight: '700', marginVertical: spacing.sm },
  muted: { color: colors.textMuted },
  gap: { marginTop: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});