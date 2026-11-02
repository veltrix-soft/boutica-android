import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../components/brand-mark';
import { Button, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';

const BENEFITS = [
  {
    icon: 'cart-outline' as const,
    title: 'Caisse POS rapide',
    description: 'Enregistrez vos ventes et gérez les remises.',
    color: colors.primary,
    background: colors.alertBg,
  },
  {
    icon: 'cube-outline' as const,
    title: 'Stocks & variantes',
    description: 'Suivez vos articles, références et inventaires.',
    color: colors.warning,
    background: colors.warningBg,
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Rapports & marges',
    description: 'Gardez un œil sur les résultats de votre activité.',
    color: colors.success,
    background: colors.successBg,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scroll maxContentWidth={560} contentStyle={styles.content}>
      <View style={styles.accent} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandMark size={48} />
          <View>
            <Text style={styles.brand}>BOUTICA</Text>
            <Text style={styles.tagline}>Gestion commerciale</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se connecter"
          onPress={() => router.replace('/login')}
          hitSlop={8}
          style={({ pressed }) => [styles.loginShortcut, pressed && styles.pressed]}
        >
          <Ionicons name="log-in-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroArtwork}>
          <View style={styles.artworkTile}>
            <Ionicons name="storefront-outline" size={43} color={colors.primary} />
          </View>
          <View style={styles.artworkBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.artworkBadgeText}>Votre commerce, en ordre</Text>
          </View>
        </View>

        <View style={styles.eyebrow}>
          <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
          <Text style={styles.eyebrowText}>Pensé pour les professionnels</Text>
        </View>
        <Text style={styles.title}>
          La gestion commerciale tout-en-un pour votre entreprise
        </Text>
        <Text style={styles.description}>
          Boutica réunit votre point de vente, vos stocks et vos indicateurs d’activité dans une
          application simple à utiliser.
        </Text>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: benefit.background }]}>
              <Ionicons name={benefit.icon} size={22} color={benefit.color} />
            </View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Commencer"
          icon="arrow-forward"
          onPress={() => router.replace('/onboarding')}
        />
        <Button
          label="Se connecter"
          icon="log-in-outline"
          variant="secondary"
          onPress={() => router.replace('/login')}
        />
      </View>

      <Text style={styles.footer}>Une solution de gestion commerciale signée Fluo.</Text>
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  tagline: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 12,
  },
  loginShortcut: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.alertBg,
  },
  hero: {
    alignItems: 'center',
  },
  heroArtwork: {
    width: '100%',
    minHeight: 146,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  artworkTile: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.alertBg,
  },
  artworkBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  artworkBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.alertBg,
  },
  eyebrowText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    maxWidth: 480,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 440,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  benefits: {
    gap: spacing.sm,
  },
  benefitCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  benefitCopy: {
    flex: 1,
    gap: 3,
  },
  benefitTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  benefitDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    gap: spacing.sm,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
