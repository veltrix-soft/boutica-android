import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getProduct,
  listVariants,
  Variant,
} from '../features/products/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { colors, spacing } from '../theme/colors';

function VariantCard({ v }: { v: Variant }) {
  const attrs = Object.entries(v.attributes ?? {})
    .map(([k, val]) => `${k} : ${val}`)
    .join(' · ');

  return (
    <View style={s.card}>
      <Text style={s.name}>{v.name}</Text>

      <Text style={s.muted}>
        SKU {v.sku}
        <Link
        href={{
          pathname: '/stock-adjust',
          params: { variantId: v.id, productId: v.productId, name: v.name },
        }}
        style={s.adjust}
      >
        Ajuster le stock ›
      </Link>
        {attrs ? ` · ${attrs}` : ''}
      </Text>

      <View style={s.row}>
        <View>
          <Text style={s.small}>Achat</Text>
          <Text style={s.buy}>
            {formatMoney(v.purchasePrice)}
          </Text>
        </View>

        <View>
          <Text style={s.small}>Vente</Text>
          <Text style={s.sell}>
            {formatMoney(v.sellingPrice)}
          </Text>
        </View>

        <View>
          <Text style={s.small}>Stock</Text>
          <Text style={s.stock}>{v.quantity}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

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
      last.page * last.pageSize < last.total
        ? last.page + 1
        : undefined,
    enabled: !!id,
  });

  const items =
    variants.data?.pages.flatMap((p) => p.data) ?? [];

  const total = variants.data?.pages[0]?.total ?? 0;
  const p = product.data;
  const error = product.error ?? variants.error;

  return (
    <View style={s.container}>
      <Link href="/products" style={s.back}>
        ‹ Produits
      </Link>

      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        refreshControl={
          <RefreshControl
            refreshing={
              variants.isRefetching &&
              !variants.isFetchingNextPage
            }
            onRefresh={() => {
              product.refetch();
              variants.refetch();
            }}
          />
        }
        onEndReached={() => {
          if (
            variants.hasNextPage &&
            !variants.isFetchingNextPage
          ) {
            variants.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {product.isLoading && (
              <ActivityIndicator color={colors.primary} />
            )}

            {p && (
              <>
                <Text style={s.title}>{p.name}</Text>

                {(p.category || p.brand) && (
                  <Text style={s.muted}>
                    {[p.category, p.brand]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}

                {p.description && (
                  <Text style={s.desc}>{p.description}</Text>
                )}
              </>
            )}

            {error && (
              <Text style={s.error}>
                {userMessage(error)}
              </Text>
            )}

            <Text style={s.section}>
              Variantes ({total})
            </Text>
            <Link
  href={{
    pathname: '/variant-new',
    params: { productId: id },
  }}
  style={s.add}
>
  + Nouvelle variante
</Link>
          </View>
        }
        renderItem={({ item }) => (
          <VariantCard v={item} />
        )}
        ListEmptyComponent={
          !variants.isLoading && !error ? (
            <Text style={s.empty}>
              Aucune variante. Il en faudra une pour pouvoir
              vendre ce produit.
            </Text>
          ) : null
        }
        ListFooterComponent={
          variants.isFetchingNextPage ? (
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
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
  },
  muted: {
    color: colors.textMuted,
    marginTop: 2,
  },
  desc: {
    color: colors.text,
    marginTop: spacing.sm,
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
  add: {
  color: colors.primary,
  fontWeight: '700',
  marginTop: spacing.sm,
},
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  small: {
    color: colors.textMuted,
    fontSize: 12,
  },
  buy: {
    color: colors.textMuted,
    fontSize: 16,
  },
  sell: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  stock: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  adjust: {
  color: colors.primary,
  fontWeight: '700',
  marginTop: spacing.sm,
},
});