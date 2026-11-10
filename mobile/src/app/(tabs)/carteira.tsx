import { Ionicons } from '@expo/vector-icons'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Badge, Card, ErrorRetry, Loading, Screen, type BadgeTone } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { getMyRecord } from '@/services/api'
import { colors, radius, spacing } from '@/theme'
import { maskCpf } from '@/utils/cpf'
import { calculateAge, formatDate, formatDateTime, initials } from '@/utils/format'

// A tela principal do app: Carteira Digital de Saúde (GET /me/record).
// Ir para o que importa primeiro em tela pequena: identidade, tipo sanguíneo e
// alergias (informações de emergência), depois o histórico clínico completo.

const SEVERITY_TONE: Record<string, BadgeTone> = { grave: 'danger', moderada: 'warning', leve: 'neutral' }
const CONDITION_TONE: Record<string, BadgeTone> = { ativa: 'danger', controlada: 'success', resolvida: 'neutral' }
const SEX_LABEL: Record<string, string> = { F: 'Feminino', M: 'Masculino', Outro: 'Outro' }

export default function CarteiraScreen() {
  const { data: patient, loading, error, refresh } = useAsync(getMyRecord, [])

  if (loading && !patient) {
    return (
      <Screen>
        <Loading full label="Carregando carteira..." />
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
  if (!patient) return null

  const hasSevereAllergy = patient.allergies.some((a) => a.severity === 'grave')

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand[600]} />}
    >
      {/* Identificação + tipo sanguíneo em destaque (uso em emergência) */}
      <View style={styles.identityCard}>
        <View style={styles.identityTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(patient.fullName)}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.name}>{patient.fullName}</Text>
            <Text style={styles.identityLine}>
              CPF {maskCpf(patient.cpf)} · {calculateAge(patient.birthDate)} anos ·{' '}
              {SEX_LABEL[patient.sex]}
            </Text>
            <Text style={styles.identityLine}>{patient.region}</Text>
          </View>
        </View>
        <View style={styles.bloodBox}>
          <Text style={styles.bloodLabel}>Tipo sanguíneo</Text>
          <Text style={styles.bloodValue}>{patient.bloodType}</Text>
        </View>
      </View>

      {/* Alergias: destaque vermelho quando existem (mimica o site) */}
      <View
        style={[
          styles.allergySection,
          patient.allergies.length > 0
            ? styles.allergySectionDanger
            : styles.allergySectionEmpty,
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="alert" size={18} color={patient.allergies.length > 0 ? colors.red[800] : colors.mint[700]} />
          <Text
            style={[
              styles.sectionTitle,
              { color: patient.allergies.length > 0 ? colors.red[800] : colors.mint[700] },
            ]}
          >
            {patient.allergies.length > 0
              ? `Alergias (${patient.allergies.length})${hasSevereAllergy ? ' — ATENÇÃO: alergia grave' : ''}`
              : 'Nenhuma alergia registrada'}
          </Text>
        </View>
        {patient.allergies.map((a) => (
          <View key={a.id} style={styles.listItemWhite}>
            <View style={styles.listItemHeader}>
              <Text style={styles.itemTitle}>{a.substance}</Text>
              <Badge label={a.severity} tone={SEVERITY_TONE[a.severity]} />
            </View>
            {a.reaction ? <Text style={styles.itemLine}>{a.reaction}</Text> : null}
            <Text style={styles.itemMeta}>Registrada em {formatDate(a.recordedAt)}</Text>
          </View>
        ))}
      </View>

      <Card title="Condições clínicas">
        {patient.clinicalConditions.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma condição registrada.</Text>
        ) : (
          <View style={styles.list}>
            {patient.clinicalConditions.map((c) => (
              <View key={c.id} style={styles.listItem}>
                <View style={styles.listItemHeader}>
                  <Text style={styles.itemTitle}>
                    {c.name}
                    {c.cid ? ` (${c.cid})` : ''}
                  </Text>
                  <Badge label={c.status} tone={CONDITION_TONE[c.status]} />
                </View>
                <Text style={styles.itemMeta}>Diagnosticada em {formatDate(c.diagnosedAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="Medicamentos ativos">
        {patient.activeMedications.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum medicamento em uso.</Text>
        ) : (
          <View style={styles.list}>
            {patient.activeMedications.map((m) => (
              <View key={m.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>
                  {m.name} · {m.dosage}
                </Text>
                <Text style={styles.itemLine}>{m.frequency}</Text>
                {m.prescribedBy ? <Text style={styles.itemMeta}>{m.prescribedBy}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="Procedimentos">
        {patient.procedures.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum procedimento registrado.</Text>
        ) : (
          <View style={styles.list}>
            {patient.procedures.map((p) => (
              <View key={p.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemLine}>{formatDate(p.date)}</Text>
                {p.location ? <Text style={styles.itemMeta}>{p.location}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="Resumos dos atendimentos">
        {patient.appointmentSummaries.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum atendimento realizado ainda.</Text>
        ) : (
          <View style={styles.list}>
            {patient.appointmentSummaries.map((s) => (
              <View key={s.appointmentId} style={styles.listItem}>
                <Text style={styles.itemTitle}>{formatDateTime(s.date)}</Text>
                <Text style={styles.itemLine}>
                  {s.doctorName}
                  {s.specialty ? ` — ${s.specialty}` : ''}
                </Text>
                <Text style={styles.itemMeta}>{s.summary}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  identityCard: {
    backgroundColor: colors.brand[700],
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  identityTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand[800], fontSize: 20, fontWeight: '700' },
  identityInfo: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.white },
  identityLine: { fontSize: 13, color: colors.brand[100] },
  bloodBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  bloodLabel: { fontSize: 11, fontWeight: '700', color: colors.red[700], textTransform: 'uppercase' },
  bloodValue: { fontSize: 22, fontWeight: '800', color: colors.red[700] },
  allergySection: {
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  allergySectionDanger: { borderColor: colors.red[600], backgroundColor: colors.red[50] },
  allergySectionEmpty: { borderColor: colors.mint[500], backgroundColor: colors.mint[50] },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  list: { gap: spacing.md },
  listItem: { gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate[200], paddingBottom: spacing.sm },
  listItemWhite: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2,
  },
  listItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.slate[900], flexShrink: 1 },
  itemLine: { fontSize: 14, color: colors.slate[600] },
  itemMeta: { fontSize: 12, color: colors.slate[500], lineHeight: 18 },
  emptyText: { fontSize: 14, color: colors.slate[500] },
})
