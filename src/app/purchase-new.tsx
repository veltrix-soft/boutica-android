import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Variant } from '../features/products/api';
import { searchVariants } from '../features/sales/api';
import { Supplier, listSupplierOptions } from '../features/suppliers/api';
import { receivePurchase, PurchaseInput } from '../features/purchases/api';
import { ApiError, userMessage } from '../api/errors';
import { formatMoney, parseAmount } from '../lib/money';
import { newIdempotencyKey } from '../lib/idempotency';
import { colors, spacing } from '../theme/colors';

type Line = { variant: Variant; qty: string; price: string };

const parseQty = (t: string): number | null =>
  /^\d+$/.test(t.trim()) && parseInt(t.trim(), 10) >= 1 ? parseInt(t.trim(), 10) : null;

function lineTotal(l: Line): Decimal | null {
  const q = parseQty(l.qty);
  const p = parseAmount(l.price);
  return q !== null && p ? p.times(q) : null;
}

export default function NewPurchase() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clé anti-doublon liée au contenu exact de l'achat
  const keyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const results = useQuery({
    queryKey: ['variants', 'search', debounced],
    queryFn: () => searchVariants(debounced),
    placeholderData: (prev) => prev,
  });

  const suppliers = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: listSupplierOptions,
    enabled: pickerOpen,
  });

  const total = lines.reduce((sum, l) => {
    const t = lineTotal(l);
    return t ? sum.plus(t) : sum;
  }, new Decimal(0));

  const m = useMutation({
    mutationFn: ({ payload, key }: { payload: PurchaseInput; key: string }) =>
      receivePurchase(payload, key),
    onSuccess: async (purchase) => {
      keyRef.current = null;
      setLines([]);
      setSupplier(null);
      setError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['variants'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['purchases'] }),
      ]);
      Alert.alert(
        'Achat enregistré',
        `Total : ${formatMoney(purchase.total)}. Le stock a été mis à jour.`,
      );
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        setError(
          "Connexion perdue : l'achat a peut-être été enregistré. " +
            'Appuyez de nouveau sur « Enregistrer l\'achat » : il ne sera pas enregistré en double.',
        );
        return;
      }
      setError(userMessage(e));
    },
  });

  function add(v: Variant) {
    setError(null);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variant.id === v.id);
      if (i === -1) {
        const price = new Decimal(v.purchasePrice).toString();
        return [...prev, { variant: v, qty: '1', price }];
      }
      return prev.map((l, j) => {
        if (j !== i) return l;
        const q = parseQty(l.qty) ?? 0;
        return { ...l, qty: String(q + 1) };
      });
    });
  }

  function update(id: string, patch: Partial<Pick<Line, 'qty' | 'price'>>) {
    setLines((prev) => prev.map((l) => (l.variant.id === id ? { ...l, ...patch } : l)));
  }

  function remove(id: string) {
    setLines((prev) => prev.filter((l) => l.variant.id !== id));
  }

  function submit() {
    if (m.isPending) return; // évite le double envoi
    if (lines.length === 0) {
      setError('Ajoutez au moins un article.');
      return;
    }
    const items: PurchaseInput['items'] = [];
    for (const l of lines) {
      const q = parseQty(l.qty);
      const p = parseAmount(l.price);
      if (q === null || !p || p.lessThan('0.01')) {
        setError(`Vérifiez la quantité et le prix de « ${l.variant.name} ».`);
        return;
      }
      items.push({ variantId: l.variant.id, quantity: q, unitPrice: p.toNumber() });
    }
    setError(null);
    const payload: PurchaseInput = {
      ...(supplier ? { supplierId: supplier.id } : {}),
      items,
    };
    const fingerprint = JSON.stringify(payload);
    if (!keyRef.current || keyRef.current.fingerprint !== fingerprint) {
      keyRef.current = { key: newIdempotencyKey(), fingerprint };
    }
    m.mutate({ payload, key: keyRef.current.key });
  }

  const found = results.data?.data ?? [];

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Link href="/" style={s.back}>‹ Retour</Link>
        <Text style={s.title}>Réception d'achat</Text>

        <TextInput
          style={s.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un article (nom ou SKU)"
          autoCorrect={false}
        />
        {results.isLoading && <ActivityIndicator color={colors.primary} />}
        {results.error && <Text style={s.error}>{userMessage(results.error)}</Text>}
        {!results.isLoading && !results.error && found.length === 0 && (
          <Text style={s.muted}>Aucun article trouvé.</Text>
        )}
        {found.map((v) => (
          <Pressable key={v.id} style={s.result} onPress={() => add(v)}
            accessibilityRole="button">
            <View style={s.flex}>
              <Text style={s.name}>{v.name}</Text>
              <Text style={s.muted}>SKU {v.sku} · Stock {v.quantity}</Text>
            </View>
            <Text style={s.buy}>{formatMoney(v.purchasePrice)}</Text>
          </Pressable>
        ))}

        <Text style={s.section}>Marchandise reçue ({lines.length})</Text>
        {lines.length === 0 && <Text style={s.muted}>Touchez un article pour l'ajouter.</Text>}
        {lines.map((l) => {
          const t = lineTotal(l);
          return (
            <View key={l.variant.id} style={s.line}>
              <Text style={s.name}>{l.variant.name}</Text>
              <View style={s.row}>
                <View style={s.field}>
                  <Text style={s.small}>Quantité</Text>
                  <TextInput style={s.smallInput} value={l.qty}
                    onChangeText={(v) => update(l.variant.id, { qty: v })}
                    keyboardType="number-pad" editable={!m.isPending} />
                </View>
                <View style={s.field}>
                  <Text style={s.small}>Prix unitaire payé</Text>
                  <TextInput style={s.smallInput} value={l.price}
                    onChangeText={(v) => update(l.variant.id, { price: v })}
                    keyboardType="decimal-pad" editable={!m.isPending} />
                </View>
              </View>
              <View style={s.row}>
                <Text style={s.muted}>
                  Sous-total : {t ? formatMoney(t.toFixed(2)) : '—'}
                </Text>
                <Pressable onPress={() => remove(l.variant.id)} accessibilityRole="button">
                  <Text style={s.remove}>Retirer</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={s.label}>Fournisseur (facultatif)</Text>
        <Pressable style={s.pick} onPress={() => setPickerOpen((o) => !o)}
          accessibilityRole="button">
          <Text style={supplier ? s.name : s.muted}>
            {supplier ? supplier.name : 'Aucun fournisseur — toucher pour choisir'}
          </Text>
        </Pressable>
        {supplier && (
          <Pressable onPress={() => setSupplier(null)} accessibilityRole="button">
            <Text style={s.link}>Retirer le fournisseur</Text>
          </Pressable>
        )}
        {pickerOpen && (
          <View style={s.picker}>
            {suppliers.isLoading && <ActivityIndicator color={colors.primary} />}
            {suppliers.error && <Text style={s.error}>{userMessage(suppliers.error)}</Text>}
            {suppliers.data && suppliers.data.data.length === 0 && (
              <Text style={s.muted}>Aucun fournisseur. Créez-en un depuis l'accueil.</Text>
            )}
            {suppliers.data?.data.map((x) => (
              <Pressable key={x.id} style={s.option}
                onPress={() => { setSupplier(x); setPickerOpen(false); }}
                accessibilityRole="button">
                <Text style={s.name}>{x.name}</Text>
                {x.phone && <Text style={s.muted}>{x.phone}</Text>}
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.totals}>
          <Text style={s.totalText}>Total estimé : {formatMoney(total.toFixed(2))}</Text>
          <Text style={s.small}>Le total définitif est calculé par le serveur.</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.button, m.isPending && s.disabled]} onPress={submit}
          disabled={m.isPending} accessibilityRole="button">
          {m.isPending ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.buttonText}>Enregistrer l'achat</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  label: { color: colors.text, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm,
    color: colors.text, fontSize: 16 },
  muted: { color: colors.textMuted },
  small: { color: colors.textMuted, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  remove: { color: colors.danger, fontWeight: '600' },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  buy: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  result: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, minHeight: 56 },
  line: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: spacing.sm, gap: spacing.md },
  field: { flex: 1 },
  smallInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.sm, color: colors.text, fontSize: 16, minHeight: 44 },
  pick: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, minHeight: 48,
    justifyContent: 'center' },
  picker: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, marginBottom: spacing.sm },
  option: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border, minHeight: 48, justifyContent: 'center' },
  totals: { marginTop: spacing.md, marginBottom: spacing.md },
  totalText: { fontSize: 22, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});