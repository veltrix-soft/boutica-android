import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Alert,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Variant } from '../features/products/api';
import { Customer, listCustomerOptions } from '../features/customers/api';
import { createSale, searchVariants, SaleInput } from '../features/sales/api';
import { ApiError, userMessage } from '../api/errors';
import { formatMoney, parseAmount } from '../lib/money';
import { newIdempotencyKey } from '../lib/idempotency';
import { colors, spacing } from '../theme/colors';

type CartLine = { variant: Variant; quantity: number };

export default function NewSale() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountText, setDiscountText] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clé anti-doublon liée au contenu exact de la vente
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

  const customers = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: listCustomerOptions,
    enabled: pickerOpen,
  });

  const subtotal = cart.reduce(
    (sum, l) => sum.plus(new Decimal(l.variant.sellingPrice).times(l.quantity)),
    new Decimal(0),
  );
  const discount = discountText.trim() ? parseAmount(discountText) : new Decimal(0);
  const total = discount ? subtotal.minus(discount) : subtotal;

  const m = useMutation({
    mutationFn: ({ payload, key }: { payload: SaleInput; key: string }) =>
      createSale(payload, key),
    onSuccess: async (sale) => {
      keyRef.current = null;
      setCart([]);
      setDiscountText('');
      setCustomer(null);
      setError(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['variants'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['sales'] }),
      ]);
      Alert.alert('Vente enregistrée', `Total : ${formatMoney(sale.total)}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        if (e.kind === 'network' || e.kind === 'timeout') {
          setError(
            'Connexion perdue : la vente a peut-être été enregistrée. ' +
              'Appuyez de nouveau sur « Valider la vente » : elle ne sera pas enregistrée en double.',
          );
          return;
        }
        if (e.message.includes('Insufficient stock')) {
          setError('Stock insuffisant pour un article. Corrigez la quantité.');
          qc.invalidateQueries({ queryKey: ['variants'] });
          return;
        }
      }
      setError(userMessage(e));
    },
  });

  function add(v: Variant) {
    setError(null);
    setCart((prev) => {
      const i = prev.findIndex((l) => l.variant.id === v.id);
      if (i === -1) return v.quantity > 0 ? [...prev, { variant: v, quantity: 1 }] : prev;
      return prev.map((l, j) =>
        j === i && l.quantity < l.variant.quantity ? { ...l, quantity: l.quantity + 1 } : l,
      );
    });
  }

  function change(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.variant.id !== id) return [l];
        const q = l.quantity + delta;
        if (q <= 0) return [];
        if (q > l.variant.quantity) return [l];
        return [{ ...l, quantity: q }];
      }),
    );
  }

  function submit() {
    if (m.isPending) return; // évite le double envoi
    if (cart.length === 0) {
      setError('Ajoutez au moins un article.');
      return;
    }
    if (!discount) {
      setError('Remise invalide (ex. 500 ou 500,50).');
      return;
    }
    if (discount.greaterThan(subtotal)) {
      setError('La remise ne peut pas dépasser le sous-total.');
      return;
    }
    setError(null);
    const payload: SaleInput = {
      items: cart.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
      ...(customer ? { customerId: customer.id } : {}),
      ...(discount.greaterThan(0) ? { discount: discount.toNumber() } : {}),
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
        <Text style={s.title}>Nouvelle vente</Text>

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
          <Pressable
            key={v.id}
            style={[s.result, v.quantity <= 0 && s.disabled]}
            onPress={() => add(v)}
            disabled={v.quantity <= 0}
            accessibilityRole="button"
          >
            <View style={s.flex}>
              <Text style={s.name}>{v.name}</Text>
              <Text style={s.muted}>SKU {v.sku} · {v.quantity > 0 ? `Stock ${v.quantity}` : 'Rupture'}</Text>
            </View>
            <Text style={s.sell}>{formatMoney(v.sellingPrice)}</Text>
          </Pressable>
        ))}

        <Text style={s.section}>Panier ({cart.length})</Text>
        {cart.length === 0 && <Text style={s.muted}>Touchez un article pour l'ajouter.</Text>}
        {cart.map((l) => (
          <View key={l.variant.id} style={s.line}>
            <View style={s.flex}>
              <Text style={s.name}>{l.variant.name}</Text>
              <Text style={s.muted}>
                {formatMoney(l.variant.sellingPrice)} × {l.quantity} ={' '}
                {formatMoney(new Decimal(l.variant.sellingPrice).times(l.quantity).toFixed(2))}
              </Text>
            </View>
            <Pressable style={s.qtyBtn} onPress={() => change(l.variant.id, -1)}
              accessibilityLabel="Retirer un" accessibilityRole="button">
              <Text style={s.qtyText}>−</Text>
            </Pressable>
            <Text style={s.qty}>{l.quantity}</Text>
            <Pressable style={s.qtyBtn} onPress={() => change(l.variant.id, 1)}
              accessibilityLabel="Ajouter un" accessibilityRole="button">
              <Text style={s.qtyText}>+</Text>
            </Pressable>
          </View>
        ))}

        <Text style={s.label}>Client (facultatif)</Text>
        <Pressable style={s.pick} onPress={() => setPickerOpen((o) => !o)}
          accessibilityRole="button">
          <Text style={customer ? s.name : s.muted}>
            {customer ? customer.name : 'Aucun client — toucher pour choisir'}
          </Text>
        </Pressable>
        {customer && (
          <Pressable onPress={() => setCustomer(null)} accessibilityRole="button">
            <Text style={s.link}>Retirer le client</Text>
          </Pressable>
        )}
        {pickerOpen && (
          <View style={s.picker}>
            {customers.isLoading && <ActivityIndicator color={colors.primary} />}
            {customers.error && <Text style={s.error}>{userMessage(customers.error)}</Text>}
            {customers.data && customers.data.data.length === 0 && (
              <Text style={s.muted}>Aucun client. Créez-en un depuis l'accueil (Clients).</Text>
            )}
            {customers.data?.data.map((c) => (
              <Pressable key={c.id} style={s.option}
                onPress={() => { setCustomer(c); setPickerOpen(false); }}
                accessibilityRole="button">
                <Text style={s.name}>{c.name}</Text>
                {c.phone && <Text style={s.muted}>{c.phone}</Text>}
              </Pressable>
            ))}
          </View>
        )}

        <Text style={s.label}>Remise (facultatif)</Text>
        <TextInput style={s.input} value={discountText} onChangeText={setDiscountText}
          keyboardType="decimal-pad" editable={!m.isPending} />

        <View style={s.totals}>
          <Text style={s.muted}>Sous-total estimé : {formatMoney(subtotal.toFixed(2))}</Text>
          <Text style={s.totalText}>Total estimé : {formatMoney(total.toFixed(2))}</Text>
          <Text style={s.small}>Le total définitif est calculé par le serveur d'après le catalogue.</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.button, m.isPending && s.disabled]} onPress={submit}
          disabled={m.isPending} accessibilityRole="button">
          {m.isPending ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.buttonText}>Valider la vente</Text>}
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
  small: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  link: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sell: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  result: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, minHeight: 56 },
  line: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border },
  pick: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, minHeight: 48,
    justifyContent: 'center' },
  picker: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, marginBottom: spacing.sm },
  option: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border, minHeight: 48, justifyContent: 'center' },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  qty: { minWidth: 32, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  totals: { marginTop: spacing.md, marginBottom: spacing.md },
  totalText: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});