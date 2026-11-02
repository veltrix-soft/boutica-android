import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listReturns } from '../features/returns/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime, returnStatusLabel } from '../lib/format';
import {
  EmptyState, ErrorState, ListItem, LoadingState, Notice, ScreenContainer,
  ScreenHeader, StatusBadge,
} from '../components/ui';
import { colors, spacing } from '../theme/colors';

export default function ReturnsScreen() {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['returns'],
    queryFn: ({ pageParam }) => listReturns(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    refetchOnMount: 'always',
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer>
      <ScreenHeader title="Retours" subtitle={q.data ? `${total} retour(s)` : undefined} />
      <Notice tone="warning">
        Pour créer un retour, ouvrez une vente puis « Retourner des articles ».
      </Notice>
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
          renderItem={({ item }) => (
            <ListItem
              icon="arrow-undo-outline"
              title={formatDateTime(item.createdAt)}
              meta={formatMoney(item.total)}
              badge={
                <StatusBadge
                  label={returnStatusLabel(item.status)}
                  tone={item.status === 'COMPLETED' ? 'success' : 'neutral'}
                />
              }
              onPress={() => router.push({ pathname: '/return', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="arrow-undo-outline" title="Aucun retour pour le moment" />
          }
          ListFooterComponent={q.isFetchingNextPage ? <LoadingState compact /> : undefined}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  gap: { height: spacing.sm },
});
