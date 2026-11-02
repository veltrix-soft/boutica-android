import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupplier } from '../features/suppliers/api';
import { ApiError, userMessage } from '../api/errors';
import { Button, FormField, Notice } from '../components/ui';
import { FormScreen } from '../components/form';

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
    <FormScreen title="Nouveau fournisseur">
      <FormField label="Nom" required value={name} onChangeText={setName}
        maxLength={200} editable={!m.isPending} />
      <FormField label="Téléphone" value={phone} onChangeText={setPhone}
        keyboardType="phone-pad" maxLength={30} editable={!m.isPending} />
      {error ? <Notice>{error}</Notice> : null}
      <Button label="Enregistrer le fournisseur" onPress={onSubmit} loading={m.isPending} />
    </FormScreen>
  );
}
