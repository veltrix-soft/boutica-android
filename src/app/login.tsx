import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { userMessage } from '../api/errors';
import { Button, FormField, Notice, ScreenContainer } from '../components/ui';
import { BrandMark } from '../components/brand-mark';
import { colors, spacing } from '../theme/colors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return; // évite le double envoi
    if (!email.trim() || !password) {
      setError('Saisissez votre email et votre mot de passe.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll maxContentWidth={480} contentStyle={s.center}>
        <View style={s.brandBox}>
          <BrandMark size={68} />
          <Text style={s.brand}>Boutica</Text>
          <Text style={s.tag}>Gestion commerciale</Text>
        </View>
        <Text style={s.heading}>Connexion</Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!submitting}
        />
        <FormField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          editable={!submitting}
          onSubmitEditing={onSubmit}
        />
        {error ? <Notice>{error}</Notice> : null}
        <Link href="/forgot-password" style={s.forgotLink}>
          Mot de passe oublié ?
        </Link>
        <Button label="Se connecter" onPress={onSubmit} loading={submitting} />

        <Link href="/register" style={s.link}>
          Pas de compte ? Créer un compte
        </Link>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flexGrow: 1, justifyContent: 'center' },
  brandBox: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.xs },
  brand: { fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  tag: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg,
    fontWeight: '600', fontSize: 15 },
  forgotLink: { color: colors.primary, textAlign: 'right', marginTop: -spacing.sm,
    marginBottom: spacing.md, fontWeight: '600', fontSize: 14 },
});