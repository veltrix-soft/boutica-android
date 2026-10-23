import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listSales } from '../../features/sales/api';
import { userMessage } from '../../api/errors';
import { formatMoney } from '../../lib/money';
import { formatDateTime, saleStatusLabel } from '../../lib/format';
import {
  Button, EmptyState, ErrorState, ListItem, LoadingState, Notice,
  ScreenContainer, ScreenHeader, StatusBadge,
} from '../../components/ui';
import { colors, spacing } from '../../theme/colors';

const tone = (st: string): 'success' | 'danger' | 'neutral' =>
  st === 'COMPLETED' ? 'success' : st === 'CANCELLED' ? 'danger' : 'neutral';

export default function SalesScreen() {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['sales'],
    queryFn: ({ pageParam }) => listSales(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    refetchOnMount: 'always',
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer bottomInset={false}>
      <ScreenHeader
        back={false}
        title="Ventes"
        subtitle={q.data ? `${total} vente(s)` : undefined}
        right={
          <Button label="Vente" icon="add" compact fullWidth={false}
            onPress={() => router.push('/sale-new')} />
        }
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error && items.length === 0 ? (
        <ErrorState message={userMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.gap} />}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching && !q.isFetchingNextPage}
              onRefresh={() => q.refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={q.error ? <Notice>{userMessage(q.error)}</Notice> : null}
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
            <EmptyState
              icon="receipt-outline"
              title="Aucune vente"
              message="Vos ventes apparaîtront ici dès la première encaissée."
              actionLabel="Nouvelle vente"
              onAction={() => router.push('/sale-new')}
            />
          }
          ListFooterComponent={q.isFetchingNextPage ? <LoadingState compact /> : null}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  gap: { height: spacing.sm },
});