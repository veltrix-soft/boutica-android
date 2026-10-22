import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExpense } from '../features/expenses/api';
import { ApiError, userMessage } from '../api/errors';
import { parseAmount } from '../lib/money';
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
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Link href="/expenses" style={s.back}>‹ Annuler</Link>
        <Text style={s.title}>Nouvelle dépense</Text>

        <Text style={s.label}>Catégorie *</Text>
        <TextInput style={s.input} value={category} onChangeText={setCategory}
          maxLength={120} editable={!m.isPending} />
        <View style={s.chips}>
          {SUGGESTIONS.map((c) => (
            <Pressable key={c} style={s.chip} onPress={() => setCategory(c)}
              accessibilityRole="button">
              <Text style={s.chipText}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Montant *</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" editable={!m.isPending} />

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.multiline]} value={description}
          onChangeText={setDescription} multiline maxLength={500}
          editable={!m.isPending} />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.button, m.isPending && s.disabled]} onPress={onSubmit}
          disabled={m.isPending} accessibilityRole="button">
          {m.isPending ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.buttonText}>Enregistrer la dépense</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary,
    marginBottom: spacing.lg },
  label: { color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm,
    color: colors.text, fontSize: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginBottom: spacing.md },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: spacing.md, minHeight: 36,
    justifyContent: 'center' },
  chipText: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});