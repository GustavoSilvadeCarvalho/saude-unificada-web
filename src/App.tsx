import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DashboardLayout, type NavItem } from './components/layout/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loading } from './components/ui/Spinner'
import { AuthProvider } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Atendimentos from './pages/medico/Atendimentos'
import BuscarPaciente from './pages/medico/BuscarPaciente'
import CadastrarPaciente from './pages/medico/CadastrarPaciente'
import MeuRegistro from './pages/medico/MeuRegistro'
import Prontuario from './pages/medico/Prontuario'
import RegistrarAtendimento from './pages/medico/RegistrarAtendimento'

// O painel do gestor (com Recharts) é carregado sob demanda para deixar o bundle inicial menor
const GestorDashboard = lazy(() => import('./pages/gestor/GestorDashboard'))

const DOCTOR_NAV: NavItem[] = [
  { to: '/medico', label: 'Meu registro', icon: 'user', end: true },
  { to: '/medico/proximos', label: 'Próximos atendimentos', icon: 'calendar' },
  { to: '/medico/historico', label: 'Atendimentos passados', icon: 'history' },
  { to: '/medico/buscar', label: 'Buscar paciente', icon: 'search' },
]

const MANAGER_NAV: NavItem[] = [{ to: '/gestor', label: 'Painel regional', icon: 'chart', end: true }]

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

        <Route
          path="/gestor"
          element={
            <ProtectedRoute role="gestor">
              <DashboardLayout navItems={MANAGER_NAV} areaLabel="Área do gestor" />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<Loading />}>
                <GestorDashboard />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
