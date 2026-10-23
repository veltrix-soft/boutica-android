import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Decimal from 'decimal.js';
import { getSale, listAllVariants } from '../features/sales/api';
import {
  createReturn, getReturn, listReturns, ReturnCondition, ReturnInput,
} from '../features/returns/api';
import { ApiError, userMessage } from '../api/errors';
import { newIdempotencyKey } from '../lib/idempotency';
import { formatMoney } from '../lib/money';
import { returnConditionLabel } from '../lib/format';
import {
  Button, ErrorState, FormField, LoadingState, Notice, ScreenContainer, ScreenHeader,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

type Line = { qty: number; condition: ReturnCondition };
const BASE: Line = { qty: 0, condition: 'RESTOCK' };

export default function NewReturn() {
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  // Clé anti-doublon liée au contenu exact du retour
  const keyRef = useRef<{ fp: string; key: string } | null>(null);

  const loadError = sale.error ?? past.error ?? pastDetails.find((q) => q.error)?.error;
  const ready = !!sale.data && !!past.data && pastDetails.every((q) => !!q.data);
  const completed = ready && sale.data?.status === 'COMPLETED';

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
  const selectedCount = items.filter((it) => (lines[it.id]?.qty ?? 0) > 0).length;
  const estimate = items.reduce(
    (sum, it) => sum.plus(new Decimal(it.unitPrice).times(lines[it.id]?.qty ?? 0)),
    new Decimal(0),
  );

  const m = useMutation({
    mutationFn: (v: { payload: ReturnInput; key: string }) => createReturn(v.payload, v.key),
    onSuccess: async (ret) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['returns'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['stock'] }),
        qc.invalidateQueries({ queryKey: ['variants'] }),
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
    if (m.isPending || !sale.data) return; // évite le double envoi
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
      <ScreenContainer scroll bottomInset={false}>
        <ScreenHeader title="Retour d'articles" subtitle="Choisissez les articles rapportés" />

        {!ready && !loadError ? <LoadingState /> : null}
        {loadError ? <ErrorState message={userMessage(loadError)} /> : null}
        {ready && !completed ? (
          <Notice>Seule une vente terminée peut avoir un retour.</Notice>
        ) : null}

        {completed ? (
          <>
            <View style={s.list}>
              {items.map((it) => {
                const remaining = Math.max(0, it.quantity - (returned.get(it.id) ?? 0));
                const line = lines[it.id] ?? BASE;
                return (
                  <View key={it.id} style={s.card}>
                    <Text style={s.name}>
                      {names.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`}
                    </Text>
                    <Text style={s.caption}>
                      {formatMoney(it.unitPrice)} · vendu {it.quantity} · déjà retourné{' '}
                      {returned.get(it.id) ?? 0} · reste {remaining}
                    </Text>
                    {remaining === 0 ? (
                      <Text style={s.caption}>Tout a déjà été retourné.</Text>
                    ) : (
                      <>
                        <View style={s.stepper}>
                          <Pressable
                            style={s.stepBtn}
                            onPress={() => set(it.id, { qty: Math.max(0, line.qty - 1) })}
                            accessibilityRole="button"
                            accessibilityLabel="Retirer un"
                          >
                            <Ionicons name="remove" size={20} color={colors.text} />
                          </Pressable>
                          <Text style={s.qty}>{line.qty}</Text>
                          <Pressable
                            style={[s.stepBtn, line.qty >= remaining && s.stepDisabled]}
                            onPress={() => set(it.id, { qty: Math.min(remaining, line.qty + 1) })}
                            disabled={line.qty >= remaining}
                            accessibilityRole="button"
                            accessibilityLabel="Ajouter un"
                          >
                            <Ionicons name="add" size={20} color={colors.text} />
                          </Pressable>
                        </View>
                        {line.qty > 0 ? (
                          <View style={s.chips}>
                            {(['RESTOCK', 'DAMAGED'] as ReturnCondition[]).map((c) => (
                              <Pressable
                                key={c}
                                style={[s.chip, line.condition === c && s.chipOn]}
                                onPress={() => set(it.id, { condition: c })}
                                accessibilityRole="button"
                              >
                                <Text style={[s.chipText, line.condition === c && s.chipTextOn]}>
                                  {returnConditionLabel(c)}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={s.reason}>
              <FormField label="Motif (facultatif)" value={reason} onChangeText={setReason}
                multiline maxLength={500} editable={!m.isPending} />
            </View>
          </>
        ) : null}
      </ScreenContainer>

      {completed ? (
        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          {error ? <Notice>{error}</Notice> : null}
          <View style={s.totalRow}>
            <Text style={[s.caption, s.flexText]}>
              Montant estimé (calcul final par le serveur)
            </Text>
            <Text style={s.totalValue}>{formatMoney(estimate.toFixed(2))}</Text>
          </View>
          <Button
            label="Enregistrer le retour"
            icon="checkmark"
            onPress={onSubmit}
            loading={m.isPending}
            disabled={selectedCount === 0}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexText: { flex: 1 },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stepBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.4 },
  qty: { minWidth: 32, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextOn: { color: '#FFFFFF' },
  reason: { marginTop: spacing.md },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm + 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm },
  totalValue: { fontSize: 22, fontWeight: '700', color: colors.text },
});