import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthContext'
import { colors } from '@/theme'
// Layout raiz: provider de autenticação + navegação por pilha.
// As telas de login/cadastro e a raiz ficam sem header nativo (interface própria);
// o grupo (tabs) tem header por aba e o detalhe de atendimento tem header com voltar.

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="atendimento/[id]"
            options={{
              headerShown: true,
              title: 'Atendimento',
              headerTintColor: colors.brand[800],
              headerStyle: { backgroundColor: colors.white },
            }}
          />
          <Stack.Screen
            name="privacidade"
            options={{
              headerShown: true,
              title: 'Quem pode ver meus dados',
              headerTintColor: colors.brand[800],
              headerStyle: { backgroundColor: colors.white },
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
