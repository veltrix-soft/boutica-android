import { useState } from 'react';
import {
  Text, TextInput, Pressable, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupplier } from '../features/suppliers/api';
import { ApiError, userMessage } from '../api/errors';
import { colors, spacing } from '../theme/colors';

export default function NewSupplier() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['suppliers'] });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        setError(
          'Connexion perdue : le fournisseur a peut-être été créé. ' +
            'Vérifiez la liste des fournisseurs avant de réessayer, pour éviter un doublon.',
        );
      } else {
        setError(userMessage(e));
      }
    },
  });

  function onSubmit() {
    if (m.isPending) return; // évite le double envoi
    if (!name.trim()) {
      setError('Le nom du fournisseur est obligatoire.');
      return;
    }
    setError(null);
    m.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Link href="/suppliers" style={s.back}>‹ Annuler</Link>
        <Text style={s.title}>Nouveau fournisseur</Text>

        <Text style={s.label}>Nom *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName}
          maxLength={200} editable={!m.isPending} />

        <Text style={s.label}>Téléphone</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" maxLength={30} editable={!m.isPending} />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.button, m.isPending && s.disabled]} onPress={onSubmit}
          disabled={m.isPending} accessibilityRole="button">
          {m.isPending ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.buttonText}>Enregistrer le fournisseur</Text>}
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
    borderRadius: 8, padding: spacing.md, marginBottom: spacing.md,
    color: colors.text, fontSize: 16 },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});