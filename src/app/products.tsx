import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listProducts } from '../features/products/api';
import { userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

export default function ProductsScreen() {
  const q = useInfiniteQuery({
    queryKey: ['products'],
    queryFn: ({ pageParam }) => listProducts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total
        ? last.page + 1
        : undefined,
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <View style={s.container}>
      <Link href="/" style={s.back}>
        ‹ Retour
      </Link>

      <Text style={s.title}>Produits</Text>

      <Link href="/product-new" style={s.add}>
        + Nouveau produit
      </Link>

      {q.data && (
        <Text style={s.muted}>{total} produit(s)</Text>
      )}

      {q.isLoading && (
        <ActivityIndicator
          color={colors.primary}
          style={s.gap}
        />
      )}

      {q.error && (
        <Text style={s.error}>
          {userMessage(q.error)}
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl
            refreshing={
              q.isRefetching && !q.isFetchingNextPage
            }
            onRefresh={() => q.refetch()}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) {
            q.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/product',
              params: { id: item.id },
            }}
            asChild
          >
            <Pressable
              style={s.card}
              accessibilityRole="button"
            >
              <Text style={s.name}>{item.name}</Text>

              {(item.category || item.brand) && (
                <Text style={s.muted}>
                  {[item.category, item.brand]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !q.isLoading && !q.error ? (
            <Text style={s.empty}>
              Aucun produit pour le moment.
            </Text>
          ) : null
        }
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} />
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    backgroundColor: colors.background,
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
  add: {
    color: colors.primary,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
  },
  gap: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});