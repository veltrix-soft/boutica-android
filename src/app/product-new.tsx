import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../features/products/api';
import { userMessage } from '../api/errors';
import { Button, FormField, Notice } from '../components/ui';
import { FormScreen } from '../components/form';

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
    if (m.isPending) return; // évite le double envoi
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
    <FormScreen title="Nouveau produit" subtitle="Vous ajouterez ses variantes (SKU, prix) ensuite.">
      <FormField label="Nom" required value={name} onChangeText={setName} editable={!m.isPending} />
      <FormField label="Catégorie" value={category} onChangeText={setCategory} editable={!m.isPending} />
      <FormField label="Marque" value={brand} onChangeText={setBrand} editable={!m.isPending} />
      <FormField label="Description" value={description} onChangeText={setDescription}
        multiline editable={!m.isPending} />
      {error ? <Notice>{error}</Notice> : null}
      <Button label="Enregistrer le produit" onPress={onSubmit} loading={m.isPending} />
    </FormScreen>
  );
}