import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { homePathFor, useAuth } from '../contexts/AuthContext'
import { USE_MOCK } from '../services/api'

const TEST_USERS = [
  { label: 'Médico', email: 'medico@teste.com', password: '123456' },
  { label: 'Gestor', email: 'gestor@teste.com', password: '123456' },
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      const loggedUser = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      const home = homePathFor(loggedUser.role)
      // Volta para a página que o usuário tentou acessar, se for da área do seu perfil
      navigate(from?.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-white to-mint-50">
      <header className="mx-auto w-full max-w-6xl px-4 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
            <p className="mt-1 text-sm text-slate-600">Acesso para profissionais de saúde e gestores públicos.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {error && <Alert tone="error">{error}</Alert>}
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              É paciente? O acesso é pelo{' '}
              <a href="/#para-quem" className="font-semibold text-brand-700 hover:underline">
                aplicativo
              </a>
              .
            </p>
          </div>

          {USE_MOCK && (
            <section aria-labelledby="test-users-title" className="mt-6 rounded-xl border border-dashed border-brand-200 bg-white/70 p-5">
              <h2 id="test-users-title" className="text-sm font-semibold text-slate-800">
                Usuários de teste (modo demonstração)
              </h2>
              <ul className="mt-3 space-y-2">
                {TEST_USERS.map((u) => (
                  <li key={u.email} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <strong className="text-slate-800">{u.label}:</strong>{' '}
                      <span className="text-slate-600">
                        {u.email} / {u.password}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEmail(u.email)
                        setPassword(u.password)
                        setError('')
                      }}
                    >
                      Preencher
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-slate-600 hover:text-brand-700 hover:underline">
              ← Voltar para o site
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
