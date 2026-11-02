import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Notice, ScreenContainer } from '../components/ui';
import { BrandMark } from '../components/brand-mark';
import { markOnboardingCompleted } from '../features/onboarding/onboarding-storage';
import { ONBOARDING_STEPS } from '../features/onboarding/onboarding-content';
import { colors, radius, spacing } from '../theme/colors';

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  async function finishIntroduction(destination: '/login' | '/register') {
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      await markOnboardingCompleted();
      router.replace(destination);
    } catch (storageError) {
      console.error('Unable to save onboarding completion:', storageError);
      setError(
        'Impossible d’enregistrer la fin de la présentation. Vérifiez le stockage de votre téléphone, puis réessayez.',
      );
    } finally {
      setSaving(false);
    }
  }

  function goToPreviousStep() {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
    } else {
      router.replace('/welcome');
    }
  }

  return (
    <ScreenContainer scroll maxContentWidth={560} contentStyle={styles.content}>
      <View style={styles.accent} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandMark size={40} />
          <View>
            <Text style={styles.brand}>BOUTICA</Text>
            <Text style={styles.tagline}>Gestion commerciale</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Passer l’introduction"
          disabled={saving}
          onPress={() => void finishIntroduction('/register')}
          hitSlop={8}
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Passer</Text>
          <Ionicons name="play-skip-forward-outline" size={17} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          ÉTAPE {step.id} SUR {ONBOARDING_STEPS.length}
        </Text>
        <View
          style={styles.progressTrack}
          accessibilityLabel={`Étape ${step.id} sur ${ONBOARDING_STEPS.length}`}
        >
          {ONBOARDING_STEPS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.progressSegment,
                index <= stepIndex ? styles.progressActive : styles.progressInactive,
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View key={step.id} entering={FadeInRight.duration(240)} style={styles.stepBody}>
        <View style={styles.visualCard}>
          <View style={[styles.stepIcon, { backgroundColor: step.iconBackground }]}>
            <Ionicons name={step.icon} size={42} color={step.iconColor} />
          </View>
          <View style={styles.visualCaption}>
            <Text style={styles.visualTitle}>{step.visualTitle}</Text>
            <Text style={styles.visualSubtitle}>{step.visualCaption}</Text>
          </View>
          <View style={styles.visualBadge}>
            <Ionicons name="checkmark-circle" size={17} color={colors.success} />
            <Text style={styles.badgeText}>{step.badge}</Text>
          </View>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>

        <View style={styles.points}>
          {step.points.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={15} color={colors.success} />
              </View>
              <View style={styles.pointCopy}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointDescription}>{point.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {error ? <Notice>{error}</Notice> : null}

      {isLastStep ? (
        <View style={styles.finalActions}>
          <Button
            label={saving ? 'Enregistrement…' : 'Créer mon compte'}
            icon="arrow-forward"
            onPress={() => void finishIntroduction('/register')}
            loading={saving}
          />
          <Button
            label="Se connecter"
            icon="log-in-outline"
            variant="secondary"
            disabled={saving}
            onPress={() => void finishIntroduction('/login')}
          />
        </View>
      ) : (
        <View style={styles.navigation}>
          <View style={styles.navigationButton}>
            <Button
              label="Précédent"
              icon="arrow-back"
              variant="secondary"
              onPress={goToPreviousStep}
            />
          </View>
          <View style={styles.navigationButton}>
            <Button
              label="Suivant"
              icon="arrow-forward"
              onPress={() => setStepIndex((current) => current + 1)}
            />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  accent: {
    height: 4,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  tagline: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 11,
  },
  skip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  skipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressInactive: {
    backgroundColor: colors.border,
  },
  stepBody: {
    gap: spacing.md,
  },
  visualCard: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginBottom: spacing.sm,
  },
  visualCaption: {
    alignItems: 'center',
    gap: 2,
  },
  visualTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  visualSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  visualBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  points: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.successBg,
    marginTop: 1,
  },
  pointCopy: {
    flex: 1,
    gap: 3,
  },
  pointTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pointDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  navigation: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navigationButton: {
    flex: 1,
  },
  finalActions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});

