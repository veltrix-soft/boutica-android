import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listPurchases } from '../../features/purchases/api';
import { userMessage } from '../../api/errors';
import { formatMoney } from '../../lib/money';
import { formatDateTime, purchaseStatusLabel } from '../../lib/format';
import {
  Button, EmptyState, ErrorState, ListItem, LoadingState, Notice,
  ScreenContainer, ScreenHeader, StatusBadge,
} from '../../components/ui';
import { colors, spacing } from '../../theme/colors';

const tone = (st: string): 'success' | 'danger' | 'neutral' =>
  st === 'RECEIVED' ? 'success' : st === 'CANCELLED' ? 'danger' : 'neutral';

export default function PurchasesScreen() {
  const router = useRouter();
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
    <ScreenContainer bottomInset={false}>
      <ScreenHeader
        back={false}
        title="Achats"
        subtitle={q.data ? `${total} achat(s)` : undefined}
        right={
          <Button label="Réception" icon="add" compact fullWidth={false}
            onPress={() => router.push('/purchase-new')} />
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
              icon="download-outline"
              title={formatDateTime(item.createdAt)}
              meta={formatMoney(item.total)}
              badge={<StatusBadge label={purchaseStatusLabel(item.status)} tone={tone(item.status)} />}
              onPress={() => router.push({ pathname: '/purchase', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="download-outline"
              title="Aucun achat"
              message="Enregistrez la marchandise reçue pour mettre à jour votre stock."
              actionLabel="Réception d'achat"
              onAction={() => router.push('/purchase-new')}
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