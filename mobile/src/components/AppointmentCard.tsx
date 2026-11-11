import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Appointment } from '@/types'
import { formatDateTime } from '@/utils/format'
import { colors, radius, spacing, touch } from '@/theme'
import { Badge } from '@/components/ui'

// Card tocável de atendimento: abre o detalhe com resumo e documentos.

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const router = useRouter()

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/atendimento/${appointment.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatDateTime(appointment.date)}</Text>
        <Badge
          label={appointment.status}
          tone={appointment.status === 'agendado' ? 'brand' : 'neutral'}
        />
      </View>
      <Text style={styles.doctor}>{appointment.doctorName}</Text>
      {appointment.reason ? (
        <Text style={styles.reason} numberOfLines={2}>
          {appointment.reason}
        </Text>
      ) : null}
      {appointment.status === 'agendado' && appointment.instructions ? (
        <Text style={styles.instructions} numberOfLines={2}>
          Orientações: {appointment.instructions}
        </Text>
      ) : null}
      <View style={styles.footerRow}>
        <Text style={styles.detail}>Ver detalhes</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: touch.min,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.slate[200],
    padding: spacing.lg,
    gap: 6,
  },
  pressed: { opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { fontSize: 15, fontWeight: '700', color: colors.slate[900], flexShrink: 1 },
  doctor: { fontSize: 14, color: colors.brand[800] },
  reason: { fontSize: 14, color: colors.slate[500], lineHeight: 20 },
  instructions: { fontSize: 13, color: colors.amber[700], lineHeight: 18 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  detail: { fontSize: 13, fontWeight: '600', color: colors.brand[700] },
})
