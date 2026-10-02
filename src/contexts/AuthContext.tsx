import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as api from '../services/api'
import type { User, UserRole } from '../types'

// Contexto de autenticação. A sessão (token + usuário) fica no sessionStorage,
// então o login sobrevive a um F5 mas termina ao fechar a aba.

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const STORAGE_KEY = 'saude-unificada:auth'

interface StoredSession {
  token: string
  user: User
}

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    api.setAuthToken(session.token)
    return session
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(loadSession)

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password)
    api.setAuthToken(response.token)
    setSession(response)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response))
    } catch {
      // segue apenas em memória
    }
    return response.user
  }, [])

  const logout = useCallback(() => {
    api.setAuthToken(null)
    setSession(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignora
    }
  }, [])

  const value = useMemo(() => ({ user: session?.user ?? null, login, logout }), [session, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return context
}

/** Usuário logado (use apenas dentro de rotas protegidas) */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('Nenhum usuário autenticado')
  return user
}

/** Rota inicial de cada perfil */
export function homePathFor(role: UserRole): string {
  return role === 'medico' ? '/medico' : '/gestor'
}
