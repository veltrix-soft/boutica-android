import { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { getSale, listAllVariants } from '../features/sales/api';
import {
  createReturn, getReturn, listReturns, ReturnCondition, ReturnInput,
} from '../features/returns/api';
import { ApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../lib/idempotency';
import { formatMoney } from '../lib/money';
import { returnConditionLabel } from '../lib/format';
import { colors, spacing } from '../theme/colors';

type Line = { qty: number; condition: ReturnCondition };
const BASE: Line = { qty: 0, condition: 'RESTOCK' };

export default function NewReturn() {
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const sale = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSale(saleId),
    enabled: !!saleId,
  });
  const variants = useQuery({ queryKey: ['variants', 'all'], queryFn: listAllVariants });
  const past = useQuery({
    queryKey: ['returns', 'forSale', saleId],
    queryFn: () => listReturns(1, saleId, 100),
    enabled: !!saleId,
  });
  const pastDetails = useQueries({
    queries: (past.data?.data ?? [])
      .filter((r) => r.status === 'COMPLETED')
      .map((r) => ({ queryKey: ['return', r.id], queryFn: () => getReturn(r.id) })),
  });

  const [lines, setLines] = useState<Record<string, Line>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<{ fp: string; key: string } | null>(null);

  const loadError = sale.error ?? past.error ?? pastDetails.find((q) => q.error)?.error;
  const ready = !!sale.data && !!past.data && pastDetails.every((q) => !!q.data);

  const names = new Map((variants.data?.data ?? []).map((v) => [v.id, v.name]));
  const returned = new Map<string, number>();
  for (const q of pastDetails) {
    for (const it of q.data?.items ?? []) {
      returned.set(it.saleItemId, (returned.get(it.saleItemId) ?? 0) + it.quantity);
    }
  }

  const set = (id: string, patch: Partial<Line>) =>
    setLines((prev) => ({ ...prev, [id]: { ...(prev[id] ?? BASE), ...patch } }));

  const items = sale.data?.items ?? [];
  const estimate = items.reduce((sum, it) => {
    const q = lines[it.id]?.qty ?? 0;
    return sum.plus(new Decimal(it.unitPrice).times(q));
  }, new Decimal(0));

  const m = useMutation({
    mutationFn: (v: { payload: ReturnInput; key: string }) =>
      createReturn(v.payload, v.key),
    onSuccess: async (ret) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['returns'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['stock'] }),
      ]);
      if (ret?.id) router.replace({ pathname: '/return', params: { id: ret.id } });
      else router.back();
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        setError(
          'Connexion perdue. Appuyez à nouveau sur le bouton : la protection ' +
            'anti-doublon évite de créer le retour deux fois.',
        );
      } else {
        setError(userMessage(e));
      }
    },
  });

  function onSubmit() {
    if (m.isPending || !sale.data) return;
    const selected = items
      .filter((it) => (lines[it.id]?.qty ?? 0) > 0)
      .map((it) => ({
        saleItemId: it.id,
        quantity: lines[it.id].qty,
        condition: lines[it.id].condition,
      }));
    if (selected.length === 0) {
      setError('Choisissez au moins un article à retourner.');
      return;
    }
    setError(null);
    const payload: ReturnInput = {
      saleId: sale.data.id,
      reason: reason.trim() || undefined,
      items: selected,
    };
    const fp = JSON.stringify(payload);
    if (!keyRef.current || keyRef.current.fp !== fp) {
      keyRef.current = { fp, key: newIdempotencyKey() };
    }
    m.mutate({ payload, key: keyRef.current.key });
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Link href={{ pathname: '/sale', params: { id: saleId } }} style={s.back}>
          ‹ Annuler
        </Link>
        <Text style={s.title}>Retour d'articles</Text>

        {!ready && !loadError && <ActivityIndicator color={colors.primary} />}
        {loadError && <Text style={s.error}>{userMessage(loadError)}</Text>}

        {ready && sale.data && sale.data.status !== 'COMPLETED' && (
          <Text style={s.error}>Seule une vente terminée peut avoir un retour.</Text>
        )}

        {ready && sale.data && sale.data.status === 'COMPLETED' && (
          <>
            <Text style={s.muted}>Choisissez les articles rapportés par le client.</Text>

            {items.map((it) => {
              const remaining = Math.max(0, it.quantity - (returned.get(it.id) ?? 0));
              const line = lines[it.id] ?? BASE;
              return (
                <View key={it.id} style={s.card}>
                  <Text style={s.name}>
                    {names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                  </Text>
                  <Text style={s.muted}>
                    {formatMoney(it.unitPrice)} · vendu : {it.quantity} · déjà retourné :{' '}
                    {returned.get(it.id) ?? 0} · reste : {remaining}
                  </Text>

                  {remaining === 0 ? (
                    <Text style={s.small}>Tout a déjà été retourné.</Text>
                  ) : (
                    <>
                      <View style={s.stepper}>
                        <Pressable style={s.stepBtn} accessibilityRole="button"
                          onPress={() => set(it.id, { qty: Math.max(0, line.qty - 1) })}>
                          <Text style={s.stepText}>−</Text>
                        </Pressable>
                        <Text style={s.qty}>{line.qty}</Text>
                        <Pressable style={s.stepBtn} accessibilityRole="button"
                          onPress={() => set(it.id, { qty: Math.min(remaining, line.qty + 1) })}>
                          <Text style={s.stepText}>+</Text>
                        </Pressable>
                      </View>

                      {line.qty > 0 && (
                        <View style={s.chips}>
                          {(['RESTOCK', 'DAMAGED'] as ReturnCondition[]).map((c) => (
                            <Pressable key={c} accessibilityRole="button"
                              style={[s.chip, line.condition === c && s.chipOn]}
                              onPress={() => set(it.id, { condition: c })}>
                              <Text style={[s.chipText, line.condition === c && s.chipTextOn]}>
                                {returnConditionLabel(c)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}

            <Text style={s.label}>Motif (facultatif)</Text>
            <TextInput style={[s.input, s.multiline]} value={reason}
              onChangeText={setReason} multiline maxLength={500}
              editable={!m.isPending} />

            <View style={s.totals}>
              <Text style={s.muted}>Montant estimé (le serveur fait le calcul final)</Text>
              <Text style={s.totalValue}>{formatMoney(estimate.toFixed(2))}</Text>
            </View>

            {error && <Text style={s.error}>{error}</Text>}

            <Pressable style={[s.button, m.isPending && s.disabled]} onPress={onSubmit}
              disabled={m.isPending} accessibilityRole="button">
              {m.isPending ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.buttonText}>Enregistrer le retour</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textMuted },
  small: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  label: { color: colors.text, fontWeight: '600', marginTop: spacing.lg,
    marginBottom: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm,
    gap: spacing.md },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    justifyContent: 'center' },
  stepText: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  qty: { color: colors.text, fontSize: 20, fontWeight: '700', minWidth: 30,
    textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginTop: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16,
    paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: spacing.md, color: colors.text, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  totals: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border },
  totalValue: { color: colors.primary, fontSize: 22, fontWeight: '700',
    marginTop: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.lg },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});