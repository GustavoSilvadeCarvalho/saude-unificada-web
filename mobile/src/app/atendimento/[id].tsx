import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Alert, Badge, Card, ErrorRetry, EmptyState, Loading, Screen } from '@/components/ui'
import { RequireAuth } from '@/auth/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { getDocumentDownloadUrl, getMyAppointments } from '@/services/api'
import type { Appointment } from '@/types'
import { colors, radius, spacing } from '@/theme'
import { formatDateTime } from '@/utils/format'

// Detalhe do atendimento (aberto em /atendimento/:id): motivo, resumo do
// profissional e documentos anexados. O download usa link temporário (5 min)
// da rota /me/.../download, aberto no navegador ou visualizador de PDF.

type AppointmentWithOrigin = { appointment: Appointment }

export default function AtendimentoRoute() {
  return (
    <RequireAuth>
      <AtendimentoScreen />
    </RequireAuth>
  )
}

function AtendimentoScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = typeof params.id === 'string' ? params.id : ''

  const { data, loading, error, refresh } = useAsync(async (): Promise<AppointmentWithOrigin | null> => {
    // O id pode vir da aba Histórico ou Agendamentos; busca nos dois status
    const [done, scheduled] = await Promise.all([
      getMyAppointments('realizado'),
      getMyAppointments('agendado'),
    ])
    const appointment = [...done, ...scheduled].find((a) => a.id === id)
    return appointment ? { appointment } : null
  }, [id])

  const [busyDoc, setBusyDoc] = useState<string | null>(null)
  const [docError, setDocError] = useState('')

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando atendimento..." />
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
  if (!data) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle"
          title="Atendimento não encontrado"
          message="Este atendimento não está mais disponível no seu histórico."
        />
      </Screen>
    )
  }

  const appointment = data.appointment

  async function openDocument(documentId: string, fileName: string): Promise<void> {
    setBusyDoc(documentId)
    setDocError('')
    try {
      const { url } = await getDocumentDownloadUrl(appointment.id, documentId)
      await Linking.openURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível abrir o arquivo.'
      setDocError(message)
    } finally {
      setBusyDoc(null)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statusRow}>
        <Badge
          label={appointment.status}
          tone={appointment.status === 'agendado' ? 'brand' : 'neutral'}
        />
        <Text style={styles.date}>{formatDateTime(appointment.date)}</Text>
      </View>

      <Card title="Profissional">
        <Text style={styles.doctor}>{appointment.doctorName}</Text>
        {appointment.reason ? <Text style={styles.reason}>Motivo: {appointment.reason}</Text> : null}
      </Card>

      {appointment.status === 'agendado' ? (
        <Card title="Orientações para o atendimento">
          <Text style={styles.summary}>
            {appointment.instructions || 'O profissional não deixou orientações para este atendimento.'}
          </Text>
        </Card>
      ) : (
        <Card title="Resumo do atendimento">
          <Text style={styles.summary}>{appointment.summary || 'Sem resumo registrado.'}</Text>
        </Card>
      )}

      {docError ? <Alert tone="error">{docError}</Alert> : null}

      <Card title={`Documentos (${appointment.documents.length})`}>
        {appointment.documents.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum documento anexado a este atendimento.</Text>
        ) : (
          <View style={styles.docList}>
            {appointment.documents.map((doc) => (
              <Pressable
                key={doc.id}
                accessibilityRole="button"
                accessibilityLabel={`Baixar ${doc.fileName}`}
                onPress={() => void openDocument(doc.id, doc.fileName)}
                disabled={busyDoc === doc.id}
                style={({ pressed }) => [styles.docRow, pressed && styles.pressed]}
              >
                <Ionicons name="document-text-outline" size={22} color={colors.brand[700]} />
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.fileName}
                  </Text>
                  <Text style={styles.docType}>Tipo: {doc.type}</Text>
                  {doc.verificationCode ? (
                    <Text style={styles.docCode}>
                      Código de conferência:{'\n'}
                      <Text style={styles.docCodeValue} selectable>
                        {doc.verificationCode}
                      </Text>
                    </Text>
                  ) : null}
                </View>
                {busyDoc === doc.id ? (
                  <Text style={styles.docAction}>Abrindo...</Text>
                ) : (
                  <Ionicons name="download-outline" size={20} color={colors.brand[700]} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { fontSize: 15, fontWeight: '700', color: colors.slate[900] },
  doctor: { fontSize: 16, fontWeight: '600', color: colors.slate[900] },
  reason: { fontSize: 14, color: colors.slate[600], lineHeight: 20, marginTop: 4 },
  summary: { fontSize: 15, color: colors.slate[800], lineHeight: 22 },
  docList: { gap: spacing.md },
  docRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: spacing.md,
  },
  pressed: { opacity: 0.8 },
  docInfo: { flex: 1, gap: 2 },
  docName: { fontSize: 14, fontWeight: '600', color: colors.slate[900] },
  docType: { fontSize: 12, color: colors.slate[500], textTransform: 'capitalize' },
  docCode: { fontSize: 12, color: colors.slate[600], marginTop: 2 },
  docCodeValue: { fontSize: 13, fontWeight: '700', color: colors.slate[900], letterSpacing: 0.5 },
  docAction: { fontSize: 13, fontWeight: '600', color: colors.brand[700] },
  emptyText: { fontSize: 14, color: colors.slate[500] },
})
