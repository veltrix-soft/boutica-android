import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProduct, listVariants, Variant } from '../features/products/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import {
  Button, EmptyState, ErrorState, LoadingState, Notice, ScreenContainer,
  ScreenHeader, SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.metric}>
      <Text style={s.caption}>{label}</Text>
      <Text style={[s.metricValue, strong && s.metricStrong]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function VariantCard({ v, onAdjust }: { v: Variant; onAdjust: () => void }) {
  const attrs = Object.entries(v.attributes ?? {})
    .map(([k, val]) => `${k} : ${val}`)
    .join(' · ');
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.flex}>
          <Text style={s.name}>{v.name}</Text>
          <Text style={s.caption}>SKU {v.sku}{attrs ? ` · ${attrs}` : ''}</Text>
        </View>
        {v.quantity <= 0 ? <StatusBadge label="Rupture" tone="danger" /> : null}
      </View>
      <View style={s.metrics}>
        <Metric label="Achat" value={formatMoney(v.purchasePrice)} />
        <Metric label="Vente" value={formatMoney(v.sellingPrice)} strong />
        <Metric label="Stock" value={String(v.quantity)} />
      </View>
      <Button label="Ajuster le stock" variant="secondary" icon="swap-vertical-outline"
        compact onPress={onAdjust} />
    </View>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  const variants = useInfiniteQuery({
    queryKey: ['variants', id],
    queryFn: ({ pageParam }) => listVariants(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: !!id,
  });

  const items = variants.data?.pages.flatMap((p) => p.data) ?? [];
  const total = variants.data?.pages[0]?.total ?? 0;
  const p = product.data;
  const error = product.error ?? variants.error;
  const retry = () => { product.refetch(); variants.refetch(); };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={p?.name ?? 'Produit'}
        subtitle={p ? [p.category, p.brand].filter(Boolean).join(' · ') || undefined : undefined}
      />
      {product.isLoading ? (
        <LoadingState />
      ) : error && !p ? (
        <ErrorState message={userMessage(error)} onRetry={retry} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.gap} />}
          refreshControl={
            <RefreshControl
              refreshing={variants.isRefetching && !variants.isFetchingNextPage}
              onRefresh={retry}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (variants.hasNextPage && !variants.isFetchingNextPage) variants.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View>
              {p?.description ? <Text style={s.desc}>{p.description}</Text> : null}
              {error ? <Notice>{userMessage(error)}</Notice> : null}
              <SectionHeader
                title={`Variantes (${total})`}
                actionLabel="+ Nouvelle variante"
                onAction={() =>
                  router.push({ pathname: '/variant-new', params: { productId: id } })
                }
              />
            </View>
          }
          renderItem={({ item }) => (
            <VariantCard
              v={item}
              onAdjust={() =>
                router.push({
                  pathname: '/stock-adjust',
                  params: { variantId: item.id, productId: item.productId, name: item.name },
                })
              }
            />
          )}
          ListEmptyComponent={
            variants.isLoading ? <LoadingState compact /> : (
              <EmptyState
                icon="pricetag-outline"
                title="Aucune variante"
                message="Il en faudra une pour pouvoir vendre ce produit."
                actionLabel="Ajouter une variante"
                onAction={() =>
                  router.push({ pathname: '/variant-new', params: { productId: id } })
                }
              />
            )
          }
          ListFooterComponent={variants.isFetchingNextPage ? <LoadingState compact /> : null}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  gap: { height: spacing.sm },
  desc: { fontSize: 14, color: colors.text, marginBottom: spacing.xs },
  caption: { fontSize: 12, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1 },
  metricValue: { fontSize: 15, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  metricStrong: { color: colors.text },
});