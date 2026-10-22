
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { adjustStock, getStock } from '../features/products/api';
import { userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

export default function StockAdjust() {
  const { variantId, productId, name } = useLocalSearchParams<{
    variantId: string;
    productId: string;
    name: string;
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
  const diff =
    prev !== undefined && next !== null ? next - prev : null;

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
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Confirmer',
          onPress: () =>
            m.mutate({
              quantity: next,
              note: note.trim() || undefined,
            }),
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Link
          href={{
            pathname: '/product',
            params: { id: productId },
          }}
          style={s.back}
        >
          ‹ Annuler
        </Link>

        <Text style={s.title}>Ajuster le stock</Text>
        <Text style={s.muted}>{name}</Text>

        <View style={s.warn}>
          <Text style={s.warnText}>
            Vous saisissez le NOUVEAU STOCK TOTAL, pas une quantité à ajouter
            ou à retirer.
          </Text>
        </View>

        {current.isLoading && (
          <ActivityIndicator color={colors.primary} />
        )}

        {current.error && (
          <Text style={s.error}>
            {userMessage(current.error)}
          </Text>
        )}

        {prev !== undefined && (
          <Text style={s.current}>
            Stock actuel : {prev}
          </Text>
        )}

        <Text style={s.label}>Nouveau stock total *</Text>

        <TextInput
          style={s.input}
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          editable={!m.isPending}
        />

        {diff !== null && diff !== 0 && (
          <Text style={s.preview}>
            Le stock passera de {prev} à {next} (
            {diff > 0 ? '+' : ''}
            {diff}).
          </Text>
        )}

        <Text style={s.label}>Note (facultatif)</Text>

        <TextInput
          style={s.input}
          value={note}
          onChangeText={setNote}
          editable={!m.isPending}
        />

        {error && (
          <Text style={s.error}>{error}</Text>
        )}

        <Pressable
          style={[
            s.button,
            (m.isPending || prev === undefined) && s.disabled,
          ]}
          onPress={onSubmit}
          disabled={m.isPending || prev === undefined}
          accessibilityRole="button"
        >
          {m.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.buttonText}>
              Enregistrer le nouveau stock
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },

  back: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },

  muted: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  warn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  warnText: {
    color: '#92400E',
    fontWeight: '600',
  },

  current: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  label: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: 16,
  },

  preview: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
