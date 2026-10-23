import { useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Decimal from 'decimal.js';
import { Variant } from '../features/products/api';
import { searchVariants } from '../features/sales/api';
import { Supplier, listSupplierOptions } from '../features/suppliers/api';
import { receivePurchase, PurchaseInput } from '../features/purchases/api';
import { ApiError, userMessage } from '../api/errors';
import { formatMoney, parseAmount } from '../lib/money';
import { newIdempotencyKey } from '../lib/idempotency';
import {
  Button, FormField, ListItem, LoadingState, Notice, ScreenContainer,
  ScreenHeader, SearchField, SectionHeader,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

type Line = { variant: Variant; qty: string; price: string };

const parseQty = (t: string): number | null =>
  /^\d+$/.test(t.trim()) && parseInt(t.trim(), 10) >= 1 ? parseInt(t.trim(), 10) : null;

function lineTotal(l: Line): Decimal | null {
  const q = parseQty(l.qty);
  const p = parseAmount(l.price);
  return q !== null && p ? p.times(q) : null;
}

export default function NewPurchase() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        [
          { text: 'Nouvel achat', style: 'cancel' },
          {
            text: 'Voir le reçu',
            onPress: () => router.push({ pathname: '/purchase', params: { id: purchase.id } }),
          },
        ],
      );
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        setError(
          "Connexion perdue : l'achat a peut-être été enregistré. " +
            "Appuyez de nouveau sur « Enregistrer l'achat » : il ne sera pas enregistré en double.",
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
  const showResults = debounced.length > 0 || lines.length === 0;

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll bottomInset={false}>
        <ScreenHeader title="Réception d'achat" />
        <SearchField value={search} onChangeText={setSearch}
          placeholder="Rechercher un article (nom ou SKU)" />

        {showResults ? (
          <>
            <SectionHeader title="Articles" />
            {results.isLoading ? (
              <LoadingState compact />
            ) : results.error ? (
              <Notice>{userMessage(results.error)}</Notice>
            ) : found.length === 0 ? (
              <Text style={s.empty}>Aucun article trouvé.</Text>
            ) : (
              <View style={s.list}>
                {found.map((v) => (
                  <ListItem
                    key={v.id}
                    icon="cube-outline"
                    title={v.name}
                    subtitle={`SKU ${v.sku} · Stock ${v.quantity}`}
                    meta={formatMoney(v.purchasePrice)}
                    metaSub="dernier achat"
                    onPress={() => add(v)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={s.hint}>Recherchez un nom ou un SKU pour ajouter un article.</Text>
        )}

        <SectionHeader title={`Marchandise reçue (${lines.length})`} />
        {lines.length === 0 ? (
          <Text style={s.empty}>Touchez un article pour l'ajouter.</Text>
        ) : (
          <View style={s.list}>
            {lines.map((l) => {
              const t = lineTotal(l);
              return (
                <View key={l.variant.id} style={s.line}>
                  <View style={s.lineTop}>
                    <Text style={s.lineName} numberOfLines={2}>{l.variant.name}</Text>
                    <Pressable
                      onPress={() => remove(l.variant.id)}
                      hitSlop={8}
                      style={s.trash}
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${l.variant.name}`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={s.fields}>
                    <View style={s.flexField}>
                      <FormField
                        label="Quantité"
                        value={l.qty}
                        onChangeText={(v) => update(l.variant.id, { qty: v })}
                        keyboardType="number-pad"
                        editable={!m.isPending}
                        error={parseQty(l.qty) === null ? 'Entier ≥ 1' : null}
                      />
                    </View>
                    <View style={s.flexField}>
                      <FormField
                        label="Prix unitaire payé"
                        value={l.price}
                        onChangeText={(v) => update(l.variant.id, { price: v })}
                        keyboardType="decimal-pad"
                        editable={!m.isPending}
                        error={!parseAmount(l.price) ? 'Prix invalide' : null}
                      />
                    </View>
                  </View>
                  <Text style={s.caption}>
                    Sous-total : {t ? formatMoney(t.toFixed(2)) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <SectionHeader title="Fournisseur" />
        {supplier ? (
          <>
            <ListItem icon="business-outline" title={supplier.name} subtitle={supplier.phone} />
            <View style={s.inlineButtons}>
              <Button label="Changer" variant="secondary" compact fullWidth={false}
                onPress={() => setPickerOpen((o) => !o)} />
              <Button label="Retirer" variant="ghost" compact fullWidth={false}
                onPress={() => setSupplier(null)} />
            </View>
          </>
        ) : (
          <Button label="Choisir un fournisseur (facultatif)" variant="secondary"
            icon="business-outline" onPress={() => setPickerOpen((o) => !o)} />
        )}
        {pickerOpen ? (
          <View style={[s.list, s.picker]}>
            {suppliers.isLoading ? <LoadingState compact /> : null}
            {suppliers.error ? <Notice>{userMessage(suppliers.error)}</Notice> : null}
            {suppliers.data && suppliers.data.data.length === 0 ? (
              <Text style={s.empty}>Aucun fournisseur. Créez-en un depuis « Plus », puis Fournisseurs.</Text>
            ) : null}
            {suppliers.data?.data.map((x) => (
              <ListItem
                key={x.id}
                icon="business-outline"
                title={x.name}
                subtitle={x.phone}
                onPress={() => { setSupplier(x); setPickerOpen(false); }}
              />
            ))}
          </View>
        ) : null}
        <View style={s.bottomSpace} />
      </ScreenContainer>

      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {error ? <Notice>{error}</Notice> : null}
        <View style={s.totalRow}>
          <Text style={[s.caption, s.flexText]}>Total de l'achat</Text>
          <Text style={s.totalValue}>{formatMoney(total.toFixed(2))}</Text>
        </View>
        <Button
          label="Enregistrer l'achat"
          icon="checkmark"
          onPress={submit}
          loading={m.isPending}
          disabled={lines.length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexText: { flex: 1 },
  flexField: { flex: 1 },
  list: { gap: spacing.sm },
  empty: { fontSize: 14, color: colors.textMuted },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  caption: { fontSize: 13, color: colors.textMuted },
  line: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fields: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  inlineButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  picker: { marginTop: spacing.sm },
  bottomSpace: { height: spacing.md },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm + 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  totalValue: { fontSize: 24, fontWeight: '700', color: colors.text },
});