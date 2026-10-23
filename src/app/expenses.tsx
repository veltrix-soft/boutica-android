import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listExpenses } from '../features/expenses/api';
import { userMessage } from '../api/errors';
import { formatMoney } from '../lib/money';
import { formatDateTime } from '../lib/format';
import {
  Button, EmptyState, ErrorState, ListItem, LoadingState, Notice,
  ScreenContainer, ScreenHeader,
} from '../components/ui';
import { colors, spacing } from '../theme/colors';

export default function ExpensesScreen() {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['expenses'],
    queryFn: ({ pageParam }) => listExpenses(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    refetchOnMount: 'always',
  });

  const items = q.data?.pages.flatMap((p) => p.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Dépenses"
        subtitle={q.data ? `${total} dépense(s)` : undefined}
        right={
          <Button
            label="Ajouter"
            icon="add"
            compact
            fullWidth={false}
            onPress={() => router.push('/expense-new')}
          />
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
          ListHeaderComponent={
            q.error ? <Notice>{userMessage(q.error)}</Notice> : null
          }
          renderItem={({ item }) => (
            <ListItem
              icon="receipt-outline"
              title={item.category}
              subtitle={item.description}
              meta={formatMoney(item.amount)}
              metaSub={formatDateTime(item.createdAt)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Aucune dépense"
              message="Ajoutez vos frais (loyer, transport, salaires…) pour suivre votre bénéfice."
              actionLabel="Ajouter une dépense"
              onAction={() => router.push('/expense-new')}
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