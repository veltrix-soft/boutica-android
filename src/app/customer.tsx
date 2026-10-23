import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getCustomer } from '../features/customers/api';
import { listSales } from '../features/sales/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, saleStatusLabel } from '../lib/format';
import {
  EmptyState, ErrorState, ListItem, LoadingState, MetricCard, Notice,
  ScreenContainer, ScreenHeader, SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, spacing } from '../theme/colors';

const tone = (st: string): 'success' | 'danger' | 'neutral' =>
  st === 'COMPLETED' ? 'success' : st === 'CANCELLED' ? 'danger' : 'neutral';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
  const retry = () => { customer.refetch(); history.refetch(); };

  return (
    <ScreenContainer>
      <ScreenHeader title={c?.name ?? 'Client'} subtitle={c?.phone ?? undefined} />
      {customer.isLoading ? (
        <LoadingState />
      ) : error && !c ? (
        <ErrorState message={userMessage(error)} onRetry={retry} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(x) => x.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.gap} />}
          refreshControl={
            <RefreshControl
              refreshing={history.isRefetching && !history.isFetchingNextPage}
              onRefresh={retry}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View>
              {error ? <Notice>{userMessage(error)}</Notice> : null}
              {history.data ? (
                <View style={s.metrics}>
                  <MetricCard label="Ventes" value={String(count)} style={s.cell} />
                  {allLoaded ? (
                    <MetricCard label="Total des achats" value={formatMoney(spent.toFixed(2))}
                      style={s.cell} />
                  ) : null}
                </View>
              ) : null}
              <SectionHeader title="Historique des ventes" />
            </View>
          }
          renderItem={({ item }) => (
            <ListItem
              icon="receipt-outline"
              title={formatDateTime(item.createdAt)}
              meta={formatMoney(item.total)}
              badge={<StatusBadge label={saleStatusLabel(item.status)} tone={tone(item.status)} />}
              onPress={() => router.push({ pathname: '/sale', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            history.isLoading ? <LoadingState compact /> : (
              <EmptyState icon="receipt-outline" title="Aucune vente pour ce client" />
            )
          }
          ListFooterComponent={history.isFetchingNextPage ? <LoadingState compact /> : null}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  gap: { height: spacing.sm },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});