import { useEffect, useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollViewInstance, StyleSheet, Text, View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { ApiError, userMessage } from '../api/errors';
import { Button, FormField, Notice, ScreenContainer } from '../components/ui';
import { BrandMark } from '../components/brand-mark';
import { colors, spacing } from '../theme/colors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForServer, setWaitingForServer] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const waitingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(
    () => () => {
      if (waitingTimer.current) clearTimeout(waitingTimer.current);
      if (passwordScrollTimer.current) clearTimeout(passwordScrollTimer.current);
    },
    [],
  );

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
    setWaitingForServer(false);
    setSubmitting(true);
    waitingTimer.current = setTimeout(() => setWaitingForServer(true), 5000);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        businessName: businessName.trim(),
      });
    } catch (e) {
      setError(
        e instanceof ApiError && e.kind === 'timeout'
          ? 'Le serveur n’a pas confirmé la création du compte. Essayez de vous connecter avec cette adresse avant de recommencer l’inscription.'
          : userMessage(e),
      );
    } finally {
      if (waitingTimer.current) clearTimeout(waitingTimer.current);
      waitingTimer.current = null;
      setWaitingForServer(false);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer
        scroll
        maxContentWidth={480}
        contentStyle={s.center}
        scrollRef={scrollRef}
      >
        <View style={s.brandBox}>
          <BrandMark size={68} />
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
          hint="Au moins 10 caractères"
          onFocus={() => {
            if (passwordScrollTimer.current) clearTimeout(passwordScrollTimer.current);
            passwordScrollTimer.current = setTimeout(
              () => scrollRef.current?.scrollToEnd({ animated: true }),
              700,
            );
          }}
          onSubmitEditing={onSubmit} />
        {waitingForServer ? (
          <Notice tone="warning">
            Le serveur met plus de temps que prévu à démarrer. Gardez cette page ouverte, cela peut prendre jusqu’à 90 secondes.
          </Notice>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}
        <Button
          label={waitingForServer ? 'Connexion au serveur…' : 'Créer mon compte'}
          onPress={onSubmit}
          loading={submitting}
        />

        <Link href="/login" style={s.link}>
          Déjà un compte ? Se connecter
        </Link>
        {keyboardVisible ? <View style={s.keyboardScrollSpace} /> : null}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flexGrow: 1, justifyContent: 'center' },
  brandBox: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.xs },
  brand: { fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  tag: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg,
    fontWeight: '600', fontSize: 15 },
  keyboardScrollSpace: { height: 220 },
});