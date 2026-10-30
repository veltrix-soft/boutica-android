import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listSuppliers } from '../features/suppliers/api';
import { userMessage } from '../api/errors';
import {
  Button, EmptyState, ErrorState, ListItem, LoadingState, Notice,
  ScreenContainer, ScreenHeader,
} from '../components/ui';
import { colors, spacing } from '../theme/colors';

export default function SuppliersScreen() {
  const router = useRouter();
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
    <ScreenContainer>
      <ScreenHeader
        title="Fournisseurs"
        subtitle={q.data ? `${total} fournisseur(s)` : undefined}
        right={
          <Button label="Nouveau" icon="add" compact fullWidth={false}
            onPress={() => router.push('/supplier-new')} />
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
            <ListItem icon="business-outline" title={item.name} subtitle={item.phone} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="Aucun fournisseur"
              message="Enregistrez vos fournisseurs pour les associer à vos achats."
              actionLabel="Nouveau fournisseur"
              onAction={() => router.push('/supplier-new')}
            />
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