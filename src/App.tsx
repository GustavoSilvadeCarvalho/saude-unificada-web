import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

// Tela provisória até as áreas de cada perfil serem implementadas
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
        <Route path="/medico/*" element={<ProtectedRoute role="medico"><PanelPlaceholder /></ProtectedRoute>} />
        <Route path="/gestor/*" element={<ProtectedRoute role="gestor"><PanelPlaceholder /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
