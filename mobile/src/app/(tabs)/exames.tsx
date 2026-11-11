import { FlatList, StyleSheet, Text, View } from 'react-native'
import { EmptyState, ErrorRetry, Loading, Screen } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { getMyExams } from '@/services/api'
import { colors, radius, spacing } from '@/theme'
import { formatDate } from '@/utils/format'

// Exames e resultados (GET /me/exams), mais recente primeiro.
// O arquivo correspondente é baixado no detalhe do atendimento (receita/laudo).

export default function ExamesScreen() {
  const { data, loading, error, refresh } = useAsync(getMyExams, [])

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando exames..." />
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

  return (
    <View style={styles.root}>
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <Text style={styles.result}>{item.result}</Text>
            {item.fileName ? (
              <Text style={styles.file} numberOfLines={1}>
                Arquivo: {item.fileName} — disponível no histórico de atendimentos
              </Text>
            ) : null}
          </View>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        removeClippedSubviews
        ListEmptyComponent={
          <EmptyState
            icon="flask-outline"
            title="Nenhum exame registrado"
            message="Exames, laudos e resultados anexados pelo profissional aparecem aqui."
          />
        }
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
  separator: { height: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.slate[200],
    padding: spacing.lg,
    gap: 4,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.slate[900] },
  date: { fontSize: 13, color: colors.brand[800], fontWeight: '600' },
  result: { fontSize: 14, color: colors.slate[600], lineHeight: 20 },
  file: { fontSize: 12, color: colors.slate[500], marginTop: 4 },
})
