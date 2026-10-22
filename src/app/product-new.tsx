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
import { Link, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../features/products/api';
import { userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

export default function NewProduct() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (e) => setError(userMessage(e)),
  });

  function onSubmit() {
    if (m.isPending) return;

    // Évite le double envoi
    if (!name.trim()) {
      setError('Le nom du produit est obligatoire.');
      return;
    }

    setError(null);

    m.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      brand: brand.trim() || undefined,
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
        <Link href="/products" style={s.back}>
          ‹ Annuler
        </Link>

        <Text style={s.title}>Nouveau produit</Text>

        <Text style={s.label}>Nom *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          editable={!m.isPending}
        />

        <Text style={s.label}>Catégorie</Text>
        <TextInput
          style={s.input}
          value={category}
          onChangeText={setCategory}
          editable={!m.isPending}
        />

        <Text style={s.label}>Marque</Text>
        <TextInput
          style={s.input}
          value={brand}
          onChangeText={setBrand}
          editable={!m.isPending}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          editable={!m.isPending}
        />

        {error && <Text style={s.error}>{error}</Text>}

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
              Enregistrer le produit
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
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
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