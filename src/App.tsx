import { Route, Routes } from 'react-router-dom'
import { DashboardLayout, type NavItem } from './components/layout/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Atendimentos from './pages/medico/Atendimentos'
import BuscarPaciente from './pages/medico/BuscarPaciente'
import CadastrarPaciente from './pages/medico/CadastrarPaciente'
import MeuRegistro from './pages/medico/MeuRegistro'
import Prontuario from './pages/medico/Prontuario'
import RegistrarAtendimento from './pages/medico/RegistrarAtendimento'

const DOCTOR_NAV: NavItem[] = [
  { to: '/medico', label: 'Meu registro', icon: 'user', end: true },
  { to: '/medico/proximos', label: 'Próximos atendimentos', icon: 'calendar' },
  { to: '/medico/historico', label: 'Atendimentos passados', icon: 'history' },
  { to: '/medico/buscar', label: 'Buscar paciente', icon: 'search' },
]

// Tela provisória até a área do gestor ser implementada
function PanelPlaceholder() {
  const { user, logout } = useAuth()
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Olá, {user?.name}</h1>
      <button className="mt-4 underline" onClick={logout}>Sair</button>
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/medico"
          element={
            <ProtectedRoute role="medico">
              <DashboardLayout navItems={DOCTOR_NAV} areaLabel="Área do médico" />
            </ProtectedRoute>
          }
        >
          <Route index element={<MeuRegistro />} />
          <Route path="proximos" element={<Atendimentos key="agendado" status="agendado" />} />
          <Route path="historico" element={<Atendimentos key="realizado" status="realizado" />} />
          <Route path="buscar" element={<BuscarPaciente />} />
          <Route path="paciente/novo" element={<CadastrarPaciente />} />
          <Route path="paciente/:cpf" element={<Prontuario />} />
          <Route path="paciente/:cpf/atendimento" element={<RegistrarAtendimento />} />
        </Route>

        <Route path="/gestor/*" element={<ProtectedRoute role="gestor"><PanelPlaceholder /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
