import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adjustStock, getStock } from '../features/products/api';
import { userMessage } from '../api/errors';
import { Button, FormField, LoadingState, MetricCard, Notice } from '../components/ui';
import { FormScreen } from '../components/form';

export default function StockAdjust() {
  const { variantId, name } = useLocalSearchParams<{
    variantId: string; productId: string; name: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = useQuery({
    queryKey: ['stock', variantId],
    queryFn: () => getStock(variantId),
    enabled: !!variantId,
  });

  const m = useMutation({
    mutationFn: (input: { quantity: number; note?: string }) =>
      adjustStock(variantId, input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['variants'] }),
        qc.invalidateQueries({ queryKey: ['stock', variantId] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      router.back();
    },
    onError: (e) => setError(userMessage(e)),
  });

  const prev = current.data?.quantity;
  const isValid = /^\d+$/.test(value.trim());
  const next = isValid ? parseInt(value.trim(), 10) : null;
  const diff = prev !== undefined && next !== null ? next - prev : null;

  function onSubmit() {
    if (m.isPending || prev === undefined) return;
    if (next === null) {
      setError('Saisissez un nombre entier (0 ou plus).');
      return;
    }
    if (diff === 0) {
      setError('Le stock saisi est identique au stock actuel.');
      return;
    }
    setError(null);
    Alert.alert(
      'Confirmer le nouveau stock',
      `Le stock de « ${name} » passera de ${prev} à ${next}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => m.mutate({ quantity: next, note: note.trim() || undefined }),
        },
      ],
    );
  }

  return (
    <FormScreen title="Ajuster le stock" subtitle={name}>
      <Notice tone="warning">
        Vous saisissez le NOUVEAU STOCK TOTAL, pas une quantité à ajouter ou à retirer.
      </Notice>
      {current.isLoading ? <LoadingState compact /> : null}
      {current.error ? <Notice>{userMessage(current.error)}</Notice> : null}
      {prev !== undefined ? <MetricCard label="Stock actuel" value={String(prev)} /> : null}

      <FormField
        label="Nouveau stock total"
        required
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        editable={!m.isPending}
        hint={
          diff !== null && diff !== 0
            ? `Le stock passera de ${prev} à ${next} (${diff > 0 ? '+' : ''}${diff}).`
            : undefined
        }
        style={{ marginTop: 16 }}
      />
      <FormField label="Note (facultatif)" value={note} onChangeText={setNote}
        editable={!m.isPending} />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        label="Enregistrer le nouveau stock"
        onPress={onSubmit}
        loading={m.isPending}
        disabled={prev === undefined}
      />
    </FormScreen>
  );
}
