import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { USE_MOCK } from '../../services/api'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from './Logo'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Marca como ativo apenas na rota exata */
  end?: boolean
}

interface DashboardLayoutProps {
  navItems: NavItem[]
  /** Nome da área, ex.: "Área do médico" */
  areaLabel: string
}

/** Layout das áreas logadas: menu lateral (gaveta no mobile) + conteúdo */
export function DashboardLayout({ navItems, areaLabel }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Fecha o menu mobile ao trocar de página
  useEffect(() => setMenuOpen(false), [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <Logo />
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-mint-700">{areaLabel}</p>
      </div>
      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <Icon name="logout" /> Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* Menu lateral fixo (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {/* Barra superior + gaveta (mobile) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="close" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {USE_MOCK && (
          <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
            Modo demonstração: dados fictícios. Alterações valem apenas nesta sessão.
          </p>
        )}
        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Título padrão das páginas internas */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
