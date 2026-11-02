import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { userMessage } from '../api/errors';
import {
  Button, confirm, FormField, Notice, ScreenContainer, ScreenHeader, SectionHeader,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

function InfoRow({
  icon, label, value,
}: { icon: 'person-outline' | 'mail-outline' | 'phone-portrait-outline' | 'cash-outline'; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={s.rowContent}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{value}</Text>
      </View>
    </View>
  );
}

function EditableInfoRow({
  icon, label, value, onEdit,
}: {
  icon: 'person-outline' | 'mail-outline';
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={s.rowContent}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{value}</Text>
      </View>
      <Pressable
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Modifier ${label.toLowerCase()}`}
        style={({ pressed }) => [s.editButton, pressed && s.editButtonPressed]}
      >
        <Text style={s.editButtonText}>Modifier</Text>
      </Pressable>
    </View>
  );
}

type BusyAction = 'signOut' | 'changeAccount' | 'name' | 'email' | 'verification' | null;
type NoticeState = { tone: 'danger' | 'success' | 'warning'; message: string };

export default function SettingsScreen() {
  const router = useRouter();
  const {
    user, signOut, refreshUser, updateName, requestEmailChange, sendEmailVerification,
  } = useAuth();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshUser()
        .then(() => {
          if (active) setNotice(null);
        })
        .catch((error: unknown) => {
          if (active) setNotice({ tone: 'danger', message: userMessage(error) });
        });

      return () => {
        active = false;
      };
    }, [refreshUser]),
  );

  async function saveName() {
    const name = nameDraft.trim();
    if (!name) {
      setNotice({ tone: 'danger', message: 'Le nom ne peut pas être vide.' });
      return;
    }

    setBusy('name');
    setNotice(null);
    try {
      await updateName(name);
      setEditingName(false);
      setNotice({ tone: 'success', message: 'Votre nom a été modifié.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: userMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function saveEmail() {
    const email = emailDraft.trim().toLowerCase();
    if (!email) {
      setNotice({ tone: 'danger', message: 'Saisissez une adresse e-mail.' });
      return;
    }

    if (email === user?.email?.toLowerCase()) {
      setEditingEmail(false);
      return;
    }

    setBusy('email');
    setNotice(null);
    try {
      await requestEmailChange(email);
      setEditingEmail(false);
      setNotice({
        tone: 'success',
        message: `Un lien de confirmation a été envoyé à ${email}. L'adresse actuelle restera active jusqu'à sa confirmation.`,
      });
    } catch (error) {
      setNotice({ tone: 'danger', message: userMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function verifyCurrentEmail() {
    setBusy('verification');
    setNotice(null);
    try {
      await sendEmailVerification();
      setNotice({
        tone: 'success',
        message: `Un lien de vérification a été envoyé à ${user?.email ?? 'votre adresse e-mail'}. Vérifiez cette adresse avant de demander son changement.`,
      });
    } catch (error) {
      setNotice({ tone: 'danger', message: userMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  function askChangeAccount() {
    if (busy) return;
    confirm({
      title: 'Changer de compte ?',
      message: 'Votre session actuelle sera fermée. Vous pourrez ensuite vous connecter avec un autre compte.',
      confirmLabel: 'Changer de compte',
      destructive: true,
      onConfirm: async () => {
        setBusy('changeAccount');
        try {
          await signOut();
          router.replace('/login');
        } finally {
          setBusy(null);
        }
      },
    });
  }

  function askSignOut() {
    if (busy) return;
    confirm({
      title: 'Se déconnecter ?',
      message: 'Votre session Boutica sera fermée sur cet appareil.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
      onConfirm: async () => {
        setBusy('signOut');
        try {
          await signOut();
        } finally {
          setBusy(null);
        }
      },
    });
  }

  return (
    <ScreenContainer scroll maxContentWidth={640}>
      <ScreenHeader title="Paramètres" subtitle="Votre compte et votre application" />

      <SectionHeader title="Mon compte" />
      <View style={s.accountCard}>
        <View style={s.accountHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user?.name?.trim().slice(0, 1).toUpperCase() || 'B'}
            </Text>
          </View>
          <View style={s.accountIdentity}>
            <Text style={s.accountName} numberOfLines={2}>
              {user?.name || 'Compte Boutica'}
            </Text>
            <View style={s.accountBadge}>
              <View style={s.statusDot} />
              <Text style={s.accountBadgeText}>Compte actif</Text>
            </View>
          </View>
        </View>
        <View style={s.divider} />
        {editingName ? (
          <View style={s.editForm}>
            <FormField
              label="Nom"
              value={nameDraft}
              onChangeText={setNameDraft}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
              returnKeyType="done"
            />
            <View style={s.formActions}>
              <Button
                label="Enregistrer"
                onPress={saveName}
                loading={busy === 'name'}
                disabled={busy !== null && busy !== 'name'}
                compact
                fullWidth={false}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setEditingName(false)}
                disabled={busy !== null}
                compact
                fullWidth={false}
              />
            </View>
          </View>
        ) : (
          <EditableInfoRow
            icon="person-outline"
            label="Nom"
            value={user?.name ?? '—'}
            onEdit={() => {
              setNameDraft(user?.name ?? '');
              setEditingName(true);
              setNotice(null);
            }}
          />
        )}
        <View style={s.divider} />
        {editingEmail ? (
          <View style={s.editForm}>
            <FormField
              label="Adresse e-mail"
              value={emailDraft}
              onChangeText={setEmailDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              maxLength={254}
              hint="L'adresse actuelle reste active jusqu'à la confirmation de la nouvelle."
            />
            <View style={s.formActions}>
              <Button
                label="Envoyer le lien"
                onPress={saveEmail}
                loading={busy === 'email'}
                disabled={busy !== null && busy !== 'email'}
                compact
                fullWidth={false}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setEditingEmail(false)}
                disabled={busy !== null}
                compact
                fullWidth={false}
              />
            </View>
          </View>
        ) : (
          <>
            {user?.emailVerified === true ? (
              <EditableInfoRow
                icon="mail-outline"
                label="Adresse e-mail"
                value={user?.email ?? '—'}
                onEdit={() => {
                  setEmailDraft(user?.email ?? '');
                  setEditingEmail(true);
                  setNotice(null);
                }}
              />
            ) : (
              <InfoRow icon="mail-outline" label="Adresse e-mail" value={user?.email ?? '—'} />
            )}
            {user?.emailVerified !== true ? (
              <View style={s.verifyBox}>
                <Text style={s.verifyHint}>
                  Vérifiez d&apos;abord votre adresse actuelle pour pouvoir la modifier en toute sécurité.
                </Text>
                <Button
                  label="Vérifier mon adresse e-mail"
                  variant="secondary"
                  icon="mail-unread-outline"
                  onPress={verifyCurrentEmail}
                  loading={busy === 'verification'}
                  disabled={busy !== null && busy !== 'verification'}
                />
              </View>
            ) : null}
          </>
        )}
        {notice ? <Notice tone={notice.tone}>{notice.message}</Notice> : null}
      </View>

      <SectionHeader title="Application" />
      <View style={s.card}>
        <InfoRow
          icon="phone-portrait-outline"
          label="Version de l’application"
          value={Constants.expoConfig?.version ?? '—'}
        />
        <View style={s.divider} />
        <InfoRow icon="cash-outline" label="Devise affichée" value="XOF" />
      </View>
      <View style={s.remindersLink}>
        <Button
          label="Configurer les rappels"
          icon="notifications-outline"
          variant="secondary"
          onPress={() => router.push('/reminders')}
        />
      </View>

      <View style={s.logout}>
        <Button
          label="Changer de compte"
          icon="people-outline"
          onPress={askChangeAccount}
          loading={busy === 'changeAccount'}
          disabled={busy !== null && busy !== 'changeAccount'}
        />
        <Button
          label="Se déconnecter"
          variant="danger"
          icon="log-out-outline"
          onPress={askSignOut}
          loading={busy === 'signOut'}
          disabled={busy !== null && busy !== 'signOut'}
        />
        <Text style={s.logoutHint}>
          « Changer de compte » ouvre la connexion pour un autre compte. « Se déconnecter » ferme simplement votre session.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.alertBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.primary },
  accountIdentity: { flex: 1, gap: spacing.xs },
  accountName: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.text },
  accountBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  accountBadgeText: { fontSize: 12, fontWeight: '600', color: colors.success },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.alertBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text, flexShrink: 1 },
  editButton: { paddingVertical: spacing.sm, paddingLeft: spacing.xs },
  editButtonPressed: { opacity: 0.65 },
  editButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  editForm: { gap: spacing.sm },
  formActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  verifyBox: { gap: spacing.sm, paddingLeft: spacing.xs },
  verifyHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },
  remindersLink: { marginTop: spacing.sm },
  logout: { marginTop: spacing.xl, gap: spacing.sm },
  logoutHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
