import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { userMessage } from '../api/errors';
import { requestPasswordReset } from '../auth/authApi';
import { Button, FormField, Notice, ScreenContainer } from '../components/ui';
import { BrandMark } from '../components/brand-mark';
import { colors, spacing } from '../theme/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Saisissez votre adresse e-mail.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(normalizedEmail);
      setSubmitted(true);
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll maxContentWidth={480} contentStyle={s.center}>
        <View style={s.brandBox}>
          <View style={s.brandRow}>
            <BrandMark />
            <View>
              <Text style={s.brand}>Boutica</Text>
              <Text style={s.tag}>Récupération du compte</Text>
            </View>
          </View>
        </View>
        <Text style={s.heading}>Mot de passe oublié</Text>
        <Text style={s.description}>
          Saisissez l’adresse e-mail associée à votre compte. Si elle existe,
          vous recevrez un lien pour choisir un nouveau mot de passe.
        </Text>

        {submitted ? (
          <Notice tone="success">
            Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.
            Vérifiez aussi vos courriers indésirables.
          </Notice>
        ) : (
          <>
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!submitting}
              onSubmitEditing={onSubmit}
            />
            {error ? <Notice>{error}</Notice> : null}
            <Button
              label="Envoyer le lien"
              onPress={onSubmit}
              loading={submitting}
            />
          </>
        )}

        <Link href="/login" style={s.link}>
          Retour à la connexion
        </Link>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flexGrow: 1, justifyContent: 'center' },
  brandBox: { alignItems: 'center', marginBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  tag: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: 15, lineHeight: 22, color: colors.textMuted, marginBottom: spacing.lg },
  link: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontWeight: '600',
    fontSize: 15,
  },
});

