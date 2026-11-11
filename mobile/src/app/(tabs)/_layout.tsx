import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { RequireAuth } from '@/auth/AuthContext'
import { colors } from '@/theme'

type IconProps = ComponentProps<typeof Ionicons>

function withIcon(name: IconProps['name']) {
  // O color da expo-router inclui null (____ColorValue_Internal); o Ionicons não aceita
  return function TabIcon({ color, size }: { focused: boolean; color: unknown; size: number }) {
    return <Ionicons name={name} color={color as IconProps['color']} size={size} />
  }
}

// Navegação do app do paciente: 5 seções na barra inferior, dentro do
// alcance do polegar (padrão one-hand). A tela "Conta" reúne o log LGPD e o logout.

export default function TabsLayout() {
  return (
    <RequireAuth>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.slate[900] },
          headerTintColor: colors.brand[800],
          tabBarActiveTintColor: colors.brand[700],
          tabBarInactiveTintColor: colors.slate[500],
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="carteira"
          options={{ title: 'Carteira de Saúde', tabBarLabel: 'Carteira', tabBarIcon: withIcon('id-card-outline') }}
        />
        <Tabs.Screen name="historico" options={{ title: 'Histórico', tabBarIcon: withIcon('time-outline') }} />
        <Tabs.Screen
          name="agendamentos"
          options={{ title: 'Agendamentos', tabBarLabel: 'Agenda', tabBarIcon: withIcon('calendar-outline') }}
        />
        <Tabs.Screen name="exames" options={{ title: 'Exames', tabBarIcon: withIcon('flask-outline') }} />
        <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: withIcon('person-circle-outline') }} />
      </Tabs>
    </RequireAuth>
  )
}
