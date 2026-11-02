import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from './brand-mark';
import { Button, Notice } from './ui';
import { colors, spacing } from '../theme/colors';

type StartupSplashScreenProps = {
  statusMessage: string;
  error?: string | null;
  onContinue?: () => void;
  onRetry?: () => void;
};

export function StartupSplashScreen({
  statusMessage,
  error,
  onContinue,
  onRetry,
}: StartupSplashScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.accent} />

      <View style={styles.center}>
        <View style={styles.logo}>
          <BrandMark size={92} />
        </View>
        <Text style={styles.brand}>BOUTICA</Text>
        <Text style={styles.tagline}>Gestion Commerciale Fluo</Text>

        <View style={styles.status}>
          {error ? null : <ActivityIndicator size="small" color={colors.primary} />}
          <Text style={[styles.statusText, error && styles.errorStatus]}>{statusMessage}</Text>
        </View>

        {error ? (
          <View style={styles.actions}>
            <Notice tone="warning">{error}</Notice>
            {onContinue ? (
              <Button
                label="Continuer"
                icon="arrow-forward"
                onPress={onContinue}
              />
            ) : null}
            {onRetry ? (
              <Button
                label="Réessayer"
                icon="refresh"
                variant="secondary"
                onPress={onRetry}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <Text style={styles.footer}>Votre gestion commerciale, simplement.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  accent: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  center: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logo: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 28,
    backgroundColor: colors.alertBg,
  },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  status: {
    minHeight: 44,
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorStatus: {
    color: colors.primary,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});

