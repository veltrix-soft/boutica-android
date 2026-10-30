import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { userMessage } from '../api/errors';
import { Button, FormField, Notice, ScreenContainer } from '../components/ui';
import { colors, spacing } from '../theme/colors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    if (!name.trim() || !businessName.trim() || !email.trim() || !password) {
      setError('Remplissez tous les champs.');
      return;
    }
    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        businessName: businessName.trim(),
      });
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
      <ScreenContainer scroll contentStyle={s.center}>
        <View style={s.brandBox}>
          <Text style={s.brand}>Boutica</Text>
          <Text style={s.tag}>Votre compte et votre entreprise seront créés ensemble</Text>
        </View>
        <Text style={s.heading}>Créer un compte</Text>

        <FormField label="Votre nom" value={name} onChangeText={setName} editable={!submitting} />
        <FormField label="Nom de l'entreprise" value={businessName}
          onChangeText={setBusinessName} editable={!submitting} />
        <FormField label="Email" value={email} onChangeText={setEmail}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          editable={!submitting} />
        <FormField label="Mot de passe" value={password} onChangeText={setPassword}
          secureTextEntry autoCapitalize="none" editable={!submitting}
          hint="Au moins 10 caractères" onSubmitEditing={onSubmit} />
        {error ? <Notice>{error}</Notice> : null}
        <Button label="Créer mon compte" onPress={onSubmit} loading={submitting} />

        <Link href="/login" style={s.link}>
          Déjà un compte ? Se connecter
        </Link>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flexGrow: 1, justifyContent: 'center' },
  brandBox: { alignItems: 'center', marginBottom: spacing.xl },
  brand: { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  tag: { fontSize: 13, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg,
    fontWeight: '600', fontSize: 15 },
});