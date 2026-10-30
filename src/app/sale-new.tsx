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
import { Customer, listCustomerOptions } from '../features/customers/api';
import { createSale, searchVariants, SaleInput } from '../features/sales/api';
import { ApiError, userMessage } from '../api/errors';
import { formatMoney, parseAmount } from '../lib/money';
import { newIdempotencyKey } from '../lib/idempotency';
import {
  Button, FormField, ListItem, LoadingState, Notice, ScreenContainer,
  ScreenHeader, SearchField, SectionHeader, StatusBadge,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

type CartLine = { variant: Variant; quantity: number };

export default function NewSale() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const discountError =
    discountText.trim() && !discount
      ? 'Montant invalide (ex. 500 ou 500,50).'
      : discount && discount.greaterThan(subtotal)
        ? 'La remise ne peut pas dépasser le sous-total.'
        : null;

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
      Alert.alert('Vente enregistrée', `Total : ${formatMoney(sale.total)}`, [
        { text: 'Nouvelle vente', style: 'cancel' },
        {
          text: 'Voir le reçu',
          onPress: () => router.push({ pathname: '/sale', params: { id: sale.id } }),
        },
      ]);
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
  const showResults = debounced.length > 0 || cart.length === 0;

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll bottomInset={false}>
        <ScreenHeader title="Nouvelle vente" />
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
                    subtitle={`SKU ${v.sku} · ${v.quantity > 0 ? `Stock ${v.quantity}` : 'Rupture'}`}
                    meta={formatMoney(v.sellingPrice)}
                    badge={v.quantity <= 0 ? <StatusBadge label="Rupture" tone="danger" /> : undefined}
                    onPress={v.quantity > 0 ? () => add(v) : undefined}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={s.hint}>Recherchez un nom ou un SKU pour ajouter un article.</Text>
        )}

        <SectionHeader title={`Panier (${cart.length})`} />
        {cart.length === 0 ? (
          <Text style={s.empty}>Touchez un article pour l&apos;ajouter.</Text>
        ) : (
          <View style={s.list}>
            {cart.map((l) => {
              const lineTotal = new Decimal(l.variant.sellingPrice).times(l.quantity);
              return (
                <View key={l.variant.id} style={s.line}>
                  <View style={s.lineTop}>
                    <View style={s.flex}>
                      <Text style={s.lineName} numberOfLines={2}>{l.variant.name}</Text>
                      <Text style={s.caption}>
                        {formatMoney(l.variant.sellingPrice)} · stock {l.variant.quantity}
                      </Text>
                    </View>
                    <Text style={s.lineTotal}>{formatMoney(lineTotal.toFixed(2))}</Text>
                  </View>
                  <View style={s.lineBottom}>
                    <Pressable
                      onPress={() => change(l.variant.id, -l.quantity)}
                      hitSlop={8}
                      style={s.trash}
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${l.variant.name} du panier`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                    <View style={s.stepper}>
                      <Pressable
                        style={s.stepBtn}
                        onPress={() => change(l.variant.id, -1)}
                        accessibilityRole="button"
                        accessibilityLabel="Retirer un"
                      >
                        <Ionicons name="remove" size={20} color={colors.text} />
                      </Pressable>
                      <Text style={s.qty}>{l.quantity}</Text>
                      <Pressable
                        style={[s.stepBtn, l.quantity >= l.variant.quantity && s.stepDisabled]}
                        onPress={() => change(l.variant.id, 1)}
                        disabled={l.quantity >= l.variant.quantity}
                        accessibilityRole="button"
                        accessibilityLabel="Ajouter un"
                      >
                        <Ionicons name="add" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <SectionHeader title="Client" />
        {customer ? (
          <>
            <ListItem icon="person-outline" title={customer.name} subtitle={customer.phone} />
            <View style={s.inlineButtons}>
              <Button label="Changer" variant="secondary" compact fullWidth={false}
                onPress={() => setPickerOpen((o) => !o)} />
              <Button label="Retirer" variant="ghost" compact fullWidth={false}
                onPress={() => setCustomer(null)} />
            </View>
          </>
        ) : (
          <Button label="Choisir un client (facultatif)" variant="secondary"
            icon="person-add-outline" onPress={() => setPickerOpen((o) => !o)} />
        )}
        {pickerOpen ? (
          <View style={[s.list, s.picker]}>
            {customers.isLoading ? <LoadingState compact /> : null}
            {customers.error ? <Notice>{userMessage(customers.error)}</Notice> : null}
            {customers.data && customers.data.data.length === 0 ? (
              <Text style={s.empty}>Aucun client. Créez-en un depuis « Plus », puis Clients.</Text>
            ) : null}
            {customers.data?.data.map((c) => (
              <ListItem
                key={c.id}
                icon="person-outline"
                title={c.name}
                subtitle={c.phone}
                onPress={() => { setCustomer(c); setPickerOpen(false); }}
              />
            ))}
          </View>
        ) : null}

        <View style={s.discount}>
          <FormField
            label="Remise (facultatif)"
            value={discountText}
            onChangeText={setDiscountText}
            keyboardType="decimal-pad"
            editable={!m.isPending}
            error={discountError}
          />
        </View>
      </ScreenContainer>

      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {error ? <Notice>{error}</Notice> : null}
        <View style={s.totalRow}>
          <View style={s.flex}>
            <Text style={s.caption}>Total estimé</Text>
            {discount && discount.greaterThan(0) ? (
              <Text style={s.caption}>
                Sous-total {formatMoney(subtotal.toFixed(2))} − remise {formatMoney(discount.toFixed(2))}
              </Text>
            ) : null}
          </View>
          <Text style={s.totalValue}>{formatMoney(total.toFixed(2))}</Text>
        </View>
        <Text style={s.hintSmall}>Le total définitif est calculé par le serveur.</Text>
        <Button
          label="Valider la vente"
          icon="checkmark"
          onPress={submit}
          loading={m.isPending}
          disabled={cart.length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { gap: spacing.sm },
  empty: { fontSize: 14, color: colors.textMuted },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  hintSmall: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  caption: { fontSize: 13, color: colors.textMuted },
  line: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md },
  lineTop: { flexDirection: 'row', gap: spacing.sm },
  lineName: { fontSize: 15, fontWeight: '600', color: colors.text },
  lineTotal: { fontSize: 15, fontWeight: '600', color: colors.text },
  lineBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.sm },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.4 },
  qty: { minWidth: 32, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  inlineButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  picker: { marginTop: spacing.sm },
  discount: { marginTop: spacing.md },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm + 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  totalValue: { fontSize: 24, fontWeight: '700', color: colors.text },
});