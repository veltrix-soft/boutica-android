
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { userMessage } from '../api/errors';
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

    if (
      !name.trim() ||
      !businessName.trim() ||
      !email.trim() ||
      !password
    ) {
      setError('Remplissez tous les champs.');
      return;
    }

    // Le serveur reste responsable de la validation définitive.
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
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
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Créer un compte</Text>

        <Text style={s.subtitle}>
          Votre compte et votre entreprise seront créés ensemble
        </Text>

        <Text style={s.label}>Votre nom</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Votre nom complet"
          autoCapitalize="words"
          editable={!submitting}
        />

        <Text style={s.label}>Nom de l'entreprise</Text>
        <TextInput
          style={s.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Nom de votre entreprise"
          editable={!submitting}
        />

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Votre adresse email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!submitting}
        />

        <Text style={s.label}>Mot de passe</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="8 caractères minimum"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!submitting}
          onSubmitEditing={onSubmit}
          returnKeyType="done"
        />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable
          style={[s.button, submitting && s.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.buttonText}>Créer mon compte</Text>
          )}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Vous avez déjà un compte ? </Text>
          <Link href="/login" style={s.link}>
            Se connecter
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
