import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExpense } from '../features/expenses/api';
import { ApiError, userMessage } from '../api/errors';
import { parseAmount } from '../lib/money';
import { Button, FormField, Notice } from '../components/ui';
import { FormScreen } from '../components/form';
import { colors, spacing } from '../theme/colors';

// Simples suggestions de saisie : la catégorie reste un texte libre
const SUGGESTIONS = ['Loyer', 'Transport', 'Salaires', 'Électricité', 'Autre'];

export default function NewExpense() {
  const router = useRouter();
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: createExpense,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['expenses'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      router.back();
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        setError(
          'Connexion perdue : la dépense a peut-être été enregistrée. ' +
            'Vérifiez la liste des dépenses avant de réessayer, pour éviter un doublon.',
        );
      } else {
        setError(userMessage(e));
      }
    },
  });

  function onSubmit() {
    if (m.isPending) return; // évite le double envoi
    if (!category.trim()) {
      setError('La catégorie est obligatoire.');
      return;
    }
    const value = parseAmount(amount);
    if (!value || value.lessThan('0.01')) {
      setError('Saisissez un montant valide, supérieur à 0 (ex. 15000).');
      return;
    }
    setError(null);
    m.mutate({
      category: category.trim(),
      amount: value.toNumber(),
      description: description.trim() || undefined,
    });
  }

  return (
    <FormScreen title="Nouvelle dépense">
      <FormField label="Catégorie" required value={category} onChangeText={setCategory}
        maxLength={120} editable={!m.isPending} />
      <View style={s.chips}>
        {SUGGESTIONS.map((c) => (
          <Pressable key={c} style={s.chip} onPress={() => setCategory(c)}
            accessibilityRole="button">
            <Text style={s.chipText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <FormField label="Montant" required value={amount} onChangeText={setAmount}
        keyboardType="decimal-pad" editable={!m.isPending} />
      <FormField label="Description" value={description} onChangeText={setDescription}
        multiline maxLength={500} editable={!m.isPending} />
      {error ? <Notice>{error}</Notice> : null}
      <Button label="Enregistrer la dépense" onPress={onSubmit} loading={m.isPending} />
    </FormScreen>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceMuted },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
