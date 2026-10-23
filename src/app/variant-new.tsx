import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addVariant, NewVariant } from '../features/products/api';
import { ApiError, userMessage } from '../api/errors';
import { parseAmount } from '../lib/money';
import { Button, FormField, Notice } from '../components/ui';
import { FormScreen } from '../components/form';

export default function NewVariantScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [purchase, setPurchase] = useState('');
  const [selling, setSelling] = useState('');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (input: NewVariant) => addVariant(productId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['variants', productId] });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.kind === 'conflict') {
        setError('Ce SKU existe déjà dans votre entreprise. Choisissez-en un autre.');
      } else {
        setError(userMessage(e));
      }
    },
  });

  function onSubmit() {
    if (m.isPending) return; // évite le double envoi
    if (!sku.trim() || !name.trim()) {
      setError('Le SKU et le nom sont obligatoires.');
      return;
    }
    const buy = parseAmount(purchase);
    const sell = parseAmount(selling);
    if (!buy || !sell) {
      setError('Saisissez des prix valides (ex. 5000 ou 5000,50).');
      return;
    }
    if (sell.lessThan(buy)) {
      setError("Le prix de vente ne peut pas être inférieur au prix d'achat.");
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
    <FormScreen title="Nouvelle variante">
      <FormField label="SKU (code unique)" required value={sku} onChangeText={setSku}
        autoCapitalize="characters" autoCorrect={false} editable={!m.isPending} />
      <FormField label="Nom" required value={name} onChangeText={setName} editable={!m.isPending} />
      <FormField label="Prix d'achat" required value={purchase} onChangeText={setPurchase}
        keyboardType="decimal-pad" editable={!m.isPending} />
      <FormField label="Prix de vente" required value={selling} onChangeText={setSelling}
        keyboardType="decimal-pad" editable={!m.isPending} />
      {error ? <Notice>{error}</Notice> : null}
      <Button label="Enregistrer la variante" onPress={onSubmit} loading={m.isPending} />
    </FormScreen>
  );
}