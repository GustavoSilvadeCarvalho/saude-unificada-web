import { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { RequireAuth } from '@/auth/AuthContext'
import { Alert, Badge, Button, EmptyState, ErrorRetry, Loading, Screen } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { getMyDoctors, setDoctorBlocked } from '@/services/api'
import type { LinkedDoctor } from '@/types'
import { colors, radius, spacing } from '@/theme'
import { confirmAction } from '@/utils/confirm'
import { formatDate } from '@/utils/format'

// Privacidade (GET /me/doctors, PUT/DELETE /me/blocked-doctors/:id): o paciente vê os
// médicos ligados a ele e bloqueia quem não quer que abra o prontuário. O médico
// bloqueado recebe "acesso negado"; os outros continuam vendo normalmente.

export default function PrivacidadeRoute() {
  return (
    <RequireAuth>
      <PrivacidadeScreen />
    </RequireAuth>
  )
}

function PrivacidadeScreen() {
  const { data, loading, error, refresh } = useAsync(getMyDoctors, [])
  const [changed, setChanged] = useState<Record<string, LinkedDoctor>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando médicos..." />
      </Screen>
    )
  }
  if (error) {
    return (
      <Screen>
        <ErrorRetry message={error} onRetry={refresh} />
      </Screen>
    )
  }

  // Mostra o estado mais recente de cada médico (resposta do PUT/DELETE) sem recarregar a lista
  const doctors = (data ?? []).map((d) => changed[d.doctorId] ?? d)

  async function toggle(doctor: LinkedDoctor) {
    const block = !doctor.blocked
    const ok = await confirmAction(
      block ? `Bloquear ${doctor.name}?` : `Liberar ${doctor.name}?`,
      block
        ? 'Este médico não vai mais conseguir abrir o seu prontuário nem os seus documentos. Os outros profissionais continuam com acesso. Você pode liberar de novo quando quiser.'
        : 'Este médico volta a poder abrir o seu prontuário durante o atendimento.',
      block ? 'Bloquear' : 'Liberar',
      block,
    )
    if (!ok) return
    setActionError('')
    setBusyId(doctor.doctorId)
    try {
      const updated = await setDoctorBlocked(doctor.doctorId, block)
      setChanged((c) => ({ ...c, [doctor.doctorId]: updated }))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={doctors}
        keyExtractor={(d) => d.doctorId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerNote}>
              Aqui estão os médicos que já atenderam você, que têm consulta marcada ou que abriram o seu prontuário. Se não
              quiser que algum deles veja os seus dados, toque em Bloquear.
            </Text>
            {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Nenhum médico ligado a você"
            message="Quando você for atendido, o profissional aparece nesta lista."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.blocked && styles.rowBlocked]}>
            <View style={styles.rowHeader}>
              <Text style={styles.name}>{item.name}</Text>
              {item.blocked ? <Badge label="Bloqueado" tone="danger" /> : <Badge label="Com acesso" tone="success" />}
            </View>
            {item.specialty || item.crm ? (
              <Text style={styles.meta}>{[item.specialty, item.crm].filter(Boolean).join(' · ')}</Text>
            ) : null}
            {item.blocked && item.blockedAt ? (
              <Text style={styles.meta}>Bloqueado em {formatDate(item.blockedAt)}</Text>
            ) : null}
            <Button
              label={item.blocked ? 'Liberar acesso' : 'Bloquear'}
              variant={item.blocked ? 'outline' : 'danger'}
              size="sm"
              icon={item.blocked ? 'lock-open-outline' : 'lock-closed-outline'}
              busy={busyId === item.doctorId}
              onPress={() => void toggle(item)}
              style={styles.action}
            />
          </View>
        )}
      />
    </View>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate[50] },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  headerNote: { fontSize: 13, color: colors.slate[500], lineHeight: 18 },
  separator: { height: spacing.md },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.slate[200],
    padding: spacing.lg,
    gap: 4,
  },
  rowBlocked: { borderColor: colors.red[100], backgroundColor: colors.red[50] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', color: colors.slate[900], flexShrink: 1 },
  meta: { fontSize: 13, color: colors.slate[600] },
  action: { alignSelf: 'flex-start', marginTop: spacing.sm },
})
