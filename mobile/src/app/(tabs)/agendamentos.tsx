import { FlatList, StyleSheet, Text, View } from 'react-native'
import { AppointmentCard } from '@/components/AppointmentCard'
import { EmptyState, ErrorRetry, Loading, Screen } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { getMyAppointments } from '@/services/api'
import { colors, spacing } from '@/theme'

// Próximos atendimentos (GET /me/appointments?status=agendado), mais próximo primeiro.
// O card traz posição informativa (sem alteração: quem remarca é o profissional).

export default function AgendamentosScreen() {
  const { data, loading, error, refresh } = useAsync(() => getMyAppointments('agendado'), [])

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando agendamentos..." />
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
        ListHeaderComponent={
          <Text style={styles.headerNote}>
            Esses são os atendimentos agendados para você. Precisa remarcar? Fale com a unidade de saúde.
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nenhum agendamento futuro"
            message="Quando um profissional agendar um atendimento, ele aparece aqui."
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
  headerNote: { fontSize: 13, color: colors.slate[500], lineHeight: 18, marginBottom: spacing.md },
})
