import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Card, EmptyState, ErrorRetry, Loading, Screen } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/auth/AuthContext'
import { getMyAccessLog } from '@/services/api'
import { colors, radius, spacing } from '@/theme'
import { confirmAction } from '@/utils/confirm'
import { maskCpf } from '@/utils/cpf'
import { formatDateTime } from '@/utils/format'

// Conta do paciente: dados da sessão, log de acessos (LGPD, GET /me/access-log)
// e opção de sair. Confirmação obrigatória antes do logout.

export default function ContaScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { data, loading, error, refresh } = useAsync(getMyAccessLog, [])

  if (loading && !data) {
    return (
      <Screen>
        <Loading full label="Carregando sua conta..." />
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

  async function confirmLogout() {
    const ok = await confirmAction('Sair da conta?', 'Você precisará entrar novamente com CPF e senha.', 'Sair', true)
    if (ok) await logout().then(() => router.replace('/login'))
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={data ?? []}
        keyExtractor={(entry, index) => `${entry.at}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.who}>
              {item.userName} ({item.userRole})
            </Text>
            <Text style={styles.when}>{formatDateTime(item.at)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <>
            <Card style={styles.accountCard}>
              <Text style={styles.accountName}>{user?.name ?? 'Paciente'}</Text>
              <Text style={styles.accountLine}>CPF {user ? maskCpf(user.cpf) : ''}</Text>
              <Text style={styles.accountLine}>Perfil: paciente</Text>
            </Card>
            <Card title="Privacidade" style={styles.privacyCard}>
              <Text style={styles.accountLine}>
                Escolha quais médicos podem abrir o seu prontuário. Quem você bloquear não vê mais os seus dados.
              </Text>
              <Button
                label="Quem pode ver meus dados"
                variant="outline"
                icon="lock-closed-outline"
                onPress={() => router.push('/privacidade')}
                style={styles.privacyButton}
              />
            </Card>
            <Text style={styles.sectionTitle}>Quem acessou seus dados</Text>
            <Text style={styles.sectionNote}>
              Conforme a LGPD, todo acesso dos profissionais ao seu prontuário fica registrado aqui.
            </Text>
          </>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {data?.length === 0 ? (
              <EmptyState
                icon="shield-checkmark-outline"
                title="Nenhum acesso registrado"
                message="Quando um profissional acessar seu prontuário, o registro aparece aqui."
              />
            ) : null}
            <Button label="Sair da conta" variant="danger" full icon="log-out-outline" onPress={() => void confirmLogout()} />
          </View>
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
  accountCard: { gap: 2 },
  privacyCard: { gap: spacing.sm, marginTop: spacing.md },
  privacyButton: { alignSelf: 'flex-start' },
  accountName: { fontSize: 18, fontWeight: '700', color: colors.slate[900] },
  accountLine: { fontSize: 14, color: colors.slate[600] },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.slate[900], marginTop: spacing.md },
  sectionNote: { fontSize: 13, color: colors.slate[500], lineHeight: 18, marginBottom: spacing.md },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.slate[200],
    padding: spacing.lg,
    gap: 2,
  },
  description: { fontSize: 15, fontWeight: '600', color: colors.slate[900] },
  who: { fontSize: 14, color: colors.brand[800] },
  when: { fontSize: 12, color: colors.slate[500] },
  footer: { gap: spacing.md, marginTop: spacing.lg },
})
