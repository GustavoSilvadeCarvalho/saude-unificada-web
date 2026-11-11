import { FlatList, StyleSheet, View } from 'react-native'
import { AppointmentCard } from '@/components/AppointmentCard'
import { EmptyState, ErrorRetry, Loading, Screen } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { getMyAppointments } from '@/services/api'
import { spacing } from '@/theme'

// Atendimentos passados (GET /me/appointments?status=realizado), mais recente primeiro.
// Lista virtualizada por ser o histórico maior; cada item abre o detalhe com
// resumo do médico e documentos (receitas/laudos) para download.

export default function HistoricoScreen() {
  const { data, loading, error, refresh } = useAsync(() => getMyAppointments('realizado'), [])

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando histórico..." />
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
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        removeClippedSubviews
        initialNumToRender={8}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Nenhum atendimento no histórico"
            message="Os atendimentos realizados com você aparecem aqui, com o resumo do profissional."
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
  root: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: 0 },
  separator: { height: spacing.md },
})
