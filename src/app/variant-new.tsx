import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  Link,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  addVariant,
  NewVariant,
} from '../features/products/api';
import { ApiError, userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

// "12 500,50" -> Decimal, ou null si le montant est invalide
function parseAmount(raw: string): Decimal | null {
  const t = raw.replace(/\s/g, '').replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    return null;
  }

  return new Decimal(t);
}

export default function NewVariantScreen() {
  const { productId } =
    useLocalSearchParams<{ productId: string }>();

  const router = useRouter();
  const qc = useQueryClient();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [purchase, setPurchase] = useState('');
  const [selling, setSelling] = useState('');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (input: NewVariant) =>
      addVariant(productId, input),

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['variants', productId],
      });

      router.back();
    },

    onError: (e) => {
      if (e instanceof ApiError && e.kind === 'conflict') {
        setError(
          'Ce SKU existe déjà dans votre entreprise. Choisissez-en un autre.',
        );
      } else {
        setError(userMessage(e));
      }
    },
  });

  function onSubmit() {
    if (m.isPending) return;

    // Évite le double envoi
    if (!sku.trim() || !name.trim()) {
      setError('Le SKU et le nom sont obligatoires.');
      return;
    }

    const buy = parseAmount(purchase);
    const sell = parseAmount(selling);

    if (!buy || !sell) {
      setError(
        'Saisissez des prix valides (ex. 5000 ou 5000,50).',
      );
      return;
    }

    if (sell.lessThan(buy)) {
      setError(
        "Le prix de vente ne peut pas être inférieur au prix d'achat.",
      );
      return;
    }

    setError(null);

    m.mutate({
      sku: sku.trim(),
      name: name.trim(),
      purchasePrice: buy.toNumber(),
      sellingPrice: sell.toNumber(),
    });
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

        <Text style={s.title}>Nouvelle variante</Text>

        <Text style={s.label}>SKU (code unique) *</Text>
        <TextInput
          style={s.input}
          value={sku}
          onChangeText={setSku}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!m.isPending}
        />

        <Text style={s.label}>Nom *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          editable={!m.isPending}
        />

        <Text style={s.label}>Prix d'achat *</Text>
        <TextInput
          style={s.input}
          value={purchase}
          onChangeText={setPurchase}
          keyboardType="decimal-pad"
          editable={!m.isPending}
        />

        <Text style={s.label}>Prix de vente *</Text>
        <TextInput
          style={s.input}
          value={selling}
          onChangeText={setSelling}
          keyboardType="decimal-pad"
          editable={!m.isPending}
        />

        {error && (
          <Text style={s.error}>{error}</Text>
        )}

        <Pressable
          style={[s.button, m.isPending && s.disabled]}
          onPress={onSubmit}
          disabled={m.isPending}
          accessibilityRole="button"
        >
          {m.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.buttonText}>
              Enregistrer la variante
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
    marginBottom: spacing.lg,
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