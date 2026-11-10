import { Redirect } from 'expo-router'
import { Screen, Loading } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'

// Rota inicial: enquanto carrega a sessão, mostra spinner; depois,
// direciona para a Carteira (logado) ou para o login com CPF.

export default function RouteIndex() {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <Screen>
        <Loading full />
      </Screen>
    )
  }

  return user ? <Redirect href="/(tabs)/carteira" /> : <Redirect href="/login" />
}
