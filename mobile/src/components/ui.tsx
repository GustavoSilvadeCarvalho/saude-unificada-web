// Componentes visuais compartilhados: equivalentes RN dos elementos do site
// (frontend/src/components/ui/*). Todos com alvos de toque de 48dp e feedback de pressionado.

import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing, touch } from '@/theme'

export type IconName = ComponentProps<typeof Ionicons>['name']

/* ---------- Screen: base com áreas seguras ---------- */

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  )
}

/* ---------- Logo ---------- */

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoBadge, { width: size + 16, height: size + 16 }]}>
        <Ionicons name="pulse" size={size} color={colors.white} />
      </View>
      <Text style={[styles.logoText, { fontSize: size }]}>Saúde Unificada</Text>
    </View>
  )
}

/* ---------- Card ---------- */

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {children}
    </View>
  )
}

/* ---------- Badge ---------- */

export type BadgeTone = 'danger' | 'warning' | 'success' | 'brand' | 'neutral'

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  danger: { bg: colors.red[100], fg: colors.red[700] },
  warning: { bg: colors.amber[100], fg: colors.amber[700] },
  success: { bg: colors.mint[100], fg: colors.mint[700] },
  brand: { bg: colors.brand[100], fg: colors.brand[800] },
  neutral: { bg: colors.slate[100], fg: colors.slate[600] },
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = BADGE_TONES[tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  )
}

/* ---------- Alert (mensagem inline) ---------- */

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'warning' | 'info'; children: ReactNode }) {
  const map = {
    error: { bg: colors.red[100], fg: colors.red[800], icon: 'alert-circle' as const },
    success: { bg: colors.mint[100], fg: colors.mint[700], icon: 'checkmark-circle' as const },
    warning: { bg: colors.amber[100], fg: colors.amber[700], icon: 'warning' as const },
    info: { bg: colors.brand[100], fg: colors.brand[800], icon: 'information-circle' as const },
  }[tone]
  return (
    <View style={[styles.alert, { backgroundColor: map.bg }]}>
      <Ionicons name={map.icon} size={20} color={map.fg} />
      <Text style={[styles.alertText, { color: map.fg }]}>{children}</Text>
    </View>
  )
}

/* ---------- Button ---------- */

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; borderColor?: string }> = {
  primary: { bg: colors.brand[700], fg: colors.white },
  outline: { bg: colors.white, fg: colors.brand[700], borderColor: colors.brand[200] },
  ghost: { bg: 'transparent', fg: colors.brand[700] },
  danger: { bg: colors.red[600], fg: colors.white },
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  busy = false,
  disabled = false,
  full = false,
  icon,
  style,
}: {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  busy?: boolean
  disabled?: boolean
  /** Estende na largura disponível (ações principais, ex.: Entrar) */
  full?: boolean
  icon?: IconName
  style?: ViewStyle
}) {
  const palette = BUTTON_COLORS[variant]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled }}
      onPress={onPress}
      disabled={busy || disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.buttonBase,
        styles[`button_${size}`],
        full && styles.buttonFull,
        { backgroundColor: palette.bg },
        palette.borderColor && { borderColor: palette.borderColor, borderWidth: 1 },
        pressed && styles.buttonPressed,
        (busy || disabled) && styles.buttonDisabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[styles.buttonLabelBase, styles[`buttonLabel_${size}`], { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

/* ---------- Input ---------- */

export function Input({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string; style?: StyleProp<TextStyle> }) {
  const hasError = Boolean(error)
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.slate[400]}
        style={[styles.input, hasError && styles.inputError, style]}
        {...props}
      />
      {(hint || error) && (
        <Text style={[styles.inputHint, hasError && { color: colors.red[700] }]}>{error ?? hint}</Text>
      )}
    </View>
  )
}

/* ---------- Loading ---------- */

export function Loading({ label, full = false }: { label?: string; full?: boolean }) {
  return (
    <View style={full && styles.loadingFull}>
      <ActivityIndicator size="large" color={colors.brand[600]} />
      {label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  )
}

/* ---------- EmptyState ---------- */

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.brand[700]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  )
}

/* ---------- Retry: erro com botão de tentar novamente ---------- */

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorRetry}>
      <Alert tone="error">{message}</Alert>
      <Button
        label="Tentar novamente"
        variant="outline"
        icon="refresh"
        onPress={onRetry}
        style={styles.errorRetryButton}
      />
    </View>
  )
}

/* ---------- Estilos ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate[50] },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    borderRadius: 12,
    backgroundColor: colors.brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontWeight: '700', color: colors.brand[800], letterSpacing: -0.3 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.slate[200],
    padding: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.slate[900], marginBottom: 12 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertText: { flex: 1, fontSize: 14, lineHeight: 20 },
  buttonBase: {
    minHeight: touch.min,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  button_sm: { minHeight: 40, paddingHorizontal: spacing.md },
  button_md: {},
  button_lg: { minHeight: 52 },
  buttonFull: { alignSelf: 'stretch' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonLabelBase: { fontSize: 15, fontWeight: '600' },
  buttonLabel_sm: { fontSize: 13 },
  buttonLabel_md: {},
  buttonLabel_lg: { fontSize: 17 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.slate[700] },
  input: {
    minHeight: touch.min,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate[300],
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.slate[900],
  },
  inputError: { borderColor: colors.red[600] },
  inputHint: { fontSize: 12, color: colors.slate[500] },
  loadingFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingLabel: { fontSize: 14, color: colors.slate[600] },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.slate[900], textAlign: 'center' },
  emptyMessage: { fontSize: 14, color: colors.slate[500], textAlign: 'center', lineHeight: 20 },
  errorRetry: { padding: spacing.xl, gap: 12 },
  errorRetryButton: { alignSelf: 'center' },
})
