import { ComponentProps, ReactElement, ReactNode, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControlProps, ScrollView,
  StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'default' | 'success' | 'danger' | 'warning';

/* ---------- Conteneur d'écran (zones de sécurité) ---------- */
export function ScreenContainer({
  children, scroll = false, refreshControl, bottomInset = true, contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  if (scroll) {
    return (
      <ScrollView
        style={s.screen}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            paddingTop: insets.top,
            paddingHorizontal: spacing.md,
            paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.lg,
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View
      style={[
        s.screen,
        {
          paddingTop: insets.top,
          paddingHorizontal: spacing.md,
          paddingBottom: bottomInset ? insets.bottom : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

/* ---------- En-tête d'écran ---------- */
export function ScreenHeader({
  title, subtitle, back = true, onBack, right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const router = useRouter();
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={s.header}>
      {back ? (
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={s.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={s.headerText}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({
  title, actionLabel, onAction,
}: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Boutons ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const PALETTE: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: '#FFFFFF', border: colors.primary },
  secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.border },
  danger: { bg: colors.surface, pressed: colors.alertBg, fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary, border: 'transparent' },
};
const DISABLED = { bg: colors.surfaceMuted, pressed: colors.surfaceMuted, fg: colors.textMuted, border: colors.border };

export function Button({
  label, onPress, variant = 'primary', icon, loading = false, disabled = false,
  compact = false, fullWidth = true, accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}) {
  const inactive = disabled || loading;
  const p = disabled && !loading ? DISABLED : PALETTE[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={compact ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        s.btn,
        compact && s.btnCompact,
        !fullWidth && s.btnAuto,
        { backgroundColor: pressed && !inactive ? p.pressed : p.bg, borderColor: p.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={p.fg} style={s.btnIcon} /> : null}
          <Text style={[s.btnText, { color: p.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------- Carte d'indicateur ---------- */
const TONE_COLOR: Record<Tone, string> = {
  default: colors.text,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

export function MetricCard({
  label, value, hint, tone = 'default', large = false, onPress, style,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  large?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
      <Text
        style={[large ? s.metricLarge : s.metricValue, { color: TONE_COLOR[tone] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {hint ? <Text style={s.metricHint} numberOfLines={2}>{hint}</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [s.card, style, pressed && s.pressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{body}</View>;
}

/* ---------- Ligne de liste ---------- */
export function ListItem({
  title, subtitle, meta, metaSub, icon, badge, onPress,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string;
  metaSub?: string;
  icon?: IconName;
  badge?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={s.row}>
      {icon ? (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={20} color={colors.textMuted} />
        </View>
      ) : null}
      <View style={s.rowMain}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
        {badge ? <View style={s.rowBadge}>{badge}</View> : null}
      </View>
      {meta || metaSub ? (
        <View style={s.rowMeta}>
          {meta ? <Text style={s.rowAmount} numberOfLines={1}>{meta}</Text> : null}
          {metaSub ? <Text style={s.rowMetaSub} numberOfLines={1}>{metaSub}</Text> : null}
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [s.card, pressed && s.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={s.card}>{content}</View>;
}

/* ---------- Badge de statut ---------- */
const BADGE: Record<'neutral' | 'success' | 'danger' | 'warning' | 'brand', { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
  success: { bg: colors.successBg, fg: colors.success },
  danger: { bg: colors.alertBg, fg: colors.danger },
  warning: { bg: colors.warningBg, fg: colors.warning },
  brand: { bg: colors.alertBg, fg: colors.primary },
};

export function StatusBadge({
  label, tone = 'neutral',
}: { label: string; tone?: keyof typeof BADGE }) {
  return (
    <View style={[s.badge, { backgroundColor: BADGE[tone].bg }]}>
      <Text style={[s.badgeText, { color: BADGE[tone].fg }]}>{label}</Text>
    </View>
  );
}

/* ---------- Champs ---------- */
export function SearchField({
  value, onChangeText, placeholder = 'Rechercher',
}: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  return (
    <View style={s.search}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={s.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function FormField({
  label, error, hint, required, style, ...input
}: { label: string; error?: string | null; hint?: string; required?: boolean } & TextInputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(input.secureTextEntry);

  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      {isPassword ? (
        <View style={[s.passwordInput, error ? s.inputError : null]}>
          <TextInput
            {...input}
            secureTextEntry={!passwordVisible}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={label}
            style={[s.passwordTextInput, input.multiline && s.inputMulti, style]}
          />
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            disabled={input.editable === false}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            accessibilityState={{ disabled: input.editable === false }}
            style={s.passwordVisibilityButton}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput
          {...input}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          style={[s.input, input.multiline && s.inputMulti, error ? s.inputError : null, style]}
        />
      )}
      {error ? (
        <Text style={s.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={s.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ---------- Message intégré (erreur, avertissement, succès) ---------- */
const NOTICE: Record<'danger' | 'warning' | 'success', { bg: string; fg: string; icon: IconName }> = {
  danger: { bg: colors.alertBg, fg: colors.danger, icon: 'alert-circle-outline' },
  warning: { bg: colors.warningBg, fg: colors.warning, icon: 'warning-outline' },
  success: { bg: colors.successBg, fg: colors.success, icon: 'checkmark-circle-outline' },
};

export function Notice({
  tone = 'danger', children,
}: { tone?: keyof typeof NOTICE; children: ReactNode }) {
  const n = NOTICE[tone];
  return (
    <View style={[s.notice, { backgroundColor: n.bg }]} accessibilityRole="alert">
      <Ionicons name={n.icon} size={18} color={n.fg} />
      <Text style={[s.noticeText, { color: n.fg }]}>{children}</Text>
    </View>
  );
}

/* ---------- États : vide, erreur, chargement ---------- */
export function EmptyState({
  icon = 'file-tray-outline', title, message, actionLabel, onAction,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.state}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <Text style={s.stateTitle}>{title}</Text>
      {message ? <Text style={s.stateMsg}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={s.stateAction}>
          <Button label={actionLabel} onPress={onAction} compact fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message, onRetry,
}: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.state}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
      <Text style={s.stateTitle}>Chargement impossible</Text>
      <Text style={s.stateMsg}>{message}</Text>
      {onRetry ? (
        <View style={s.stateAction}>
          <Button label="Réessayer" variant="secondary" icon="refresh" onPress={onRetry} compact fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[s.state, compact && s.stateCompact]} accessibilityLabel="Chargement en cours">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/* ---------- Confirmation ---------- */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  Alert.alert(opts.title, opts.message, [
    { text: 'Annuler', style: 'cancel' },
    {
      text: opts.confirmLabel ?? 'Confirmer',
      style: opts.destructive ? 'destructive' : 'default',
      onPress: opts.onConfirm,
    },
  ]);
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pressed: { backgroundColor: colors.surfaceMuted },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: spacing.sm },
  iconBtn: { width: 40, height: 40, marginLeft: -spacing.sm, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted },

  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionAction: { ...typography.bodyStrong, color: colors.primary },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48,
    paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  btnCompact: { minHeight: 40, paddingHorizontal: spacing.md - 2 },
  btnAuto: { alignSelf: 'flex-start' },
  btnIcon: { marginRight: spacing.xs + 2 },
  btnText: { ...typography.bodyStrong },

  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  metricValue: { ...typography.heading, fontVariant: ['tabular-nums'], marginTop: 2 },
  metricLarge: { fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
  metricHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rowBadge: { flexDirection: 'row', marginTop: spacing.xs + 2 },
  rowMeta: { alignItems: 'flex-end', maxWidth: '45%' },
  rowAmount: { ...typography.amount, color: colors.text },
  rowMetaSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...typography.label },

  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44,
    paddingHorizontal: spacing.sm + 4, backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },

  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs + 2 },
  passwordInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48 },
  passwordTextInput: { ...typography.body, color: colors.text, flex: 1,
    paddingLeft: spacing.md - 2, paddingRight: spacing.sm, paddingVertical: spacing.sm + 4 },
  passwordVisibilityButton: { width: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  input: { ...typography.body, color: colors.text, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2, paddingVertical: spacing.sm + 4, minHeight: 48 },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  fieldError: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  fieldHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    padding: spacing.sm + 4, borderRadius: radius.md, marginVertical: spacing.sm },
  noticeText: { flex: 1, ...typography.caption, lineHeight: 19 },

  state: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  stateCompact: { padding: spacing.md },
  stateTitle: { ...typography.heading, color: colors.text, textAlign: 'center' },
  stateMsg: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  stateAction: { marginTop: spacing.sm },
});