import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { listProducts } from '../../features/products/api';
import { searchVariants } from '../../features/sales/api';
import { userMessage } from '../../api/errors';
import { formatMoney } from '../../lib/money';
import {
  Button, EmptyState, ErrorState, ListItem, LoadingState, Notice,
  ScreenContainer, ScreenHeader, SearchField,
} from '../../components/ui';
import { colors, spacing } from '../../theme/colors';

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const q = useInfiniteQuery({
    queryKey: ['products'],
    queryFn: ({ pageParam }) => listProducts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: !debounced,
  });

  const found = useQuery({
    queryKey: ['variants', 'search', debounced],
    queryFn: () => searchVariants(debounced),
    enabled: !!debounced,
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer bottomInset={false}>
      <ScreenHeader
        back={false}
        title="Produits"
        subtitle={!debounced && q.data ? `${total} produit(s)` : undefined}
        right={
          <Button label="Nouveau" icon="add" compact fullWidth={false}
            onPress={() => router.push('/product-new')} />
        }
      />
      <View style={s.search}>
        <SearchField value={search} onChangeText={setSearch}
          placeholder="Rechercher un article (nom ou SKU)" />
      </View>

      {debounced ? (
        found.isLoading ? (
          <LoadingState />
        ) : found.error ? (
          <ErrorState message={userMessage(found.error)} onRetry={() => found.refetch()} />
        ) : (
          <FlatList
            data={found.data?.data ?? []}
            keyExtractor={(v) => v.id}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={s.gap} />}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ListItem
                icon="pricetag-outline"
                title={item.name}
                subtitle={`SKU ${item.sku}`}
                meta={formatMoney(item.sellingPrice)}
                metaSub={`Stock ${item.quantity}`}
                onPress={() => router.push({ pathname: '/product', params: { id: item.productId } })}
              />
            )}
            ListEmptyComponent={
              <EmptyState icon="search-outline" title="Aucun article trouvé"
                message="Vérifiez l'orthographe ou essayez le SKU." />
            }
          />
        )
      ) : q.isLoading ? (
        <LoadingState />
      ) : q.error && items.length === 0 ? (
        <ErrorState message={userMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.gap} />}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching && !q.isFetchingNextPage}
              onRefresh={async () => {
                await q.refetch();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={q.error ? <Notice>{userMessage(q.error)}</Notice> : undefined}
          renderItem={({ item }) => (
            <ListItem
              icon="cube-outline"
              title={item.name}
              subtitle={[item.category, item.brand].filter(Boolean).join(' · ') || undefined}
              onPress={() => router.push({ pathname: '/product', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="Aucun produit"
              message="Créez un produit, puis ajoutez ses variantes pour pouvoir le vendre."
              actionLabel="Nouveau produit"
              onAction={() => router.push('/product-new')}
            />
          }
          ListFooterComponent={q.isFetchingNextPage ? <LoadingState compact /> : undefined}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  search: { marginBottom: spacing.sm },
  list: { paddingBottom: spacing.lg },
  gap: { height: spacing.sm },
});