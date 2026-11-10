import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import * as api from '@/services/api'
import type { PatientUser } from '@/types'

// Contexto de autenticação do paciente.
// O token vai para o keystore/keychain (expo-secure-store) e os dados do usuário
// para o AsyncStorage. Na web, ambos ficam no AsyncStorage (SecureStore não existe lá).

const USER_KEY = 'saude-unificada:auth:user'
const TOKEN_KEY = 'saude_unificada_auth_token'

interface TokenStore {
  get(): Promise<string | null>
  set(value: string | null): Promise<void>
}

const tokenStore: TokenStore =
  Platform.OS === 'web'
    ? {
        get: () => AsyncStorage.getItem(TOKEN_KEY),
        set: async (value) => {
          if (value === null) await AsyncStorage.removeItem(TOKEN_KEY)
          else await AsyncStorage.setItem(TOKEN_KEY, value)
        },
      }
    : {
        get: () => SecureStore.getItemAsync(TOKEN_KEY),
        set: async (value) => {
          if (value === null) await SecureStore.deleteItemAsync(TOKEN_KEY)
          else await SecureStore.setItemAsync(TOKEN_KEY, value)
        },
      }

interface AuthContextValue {
  user: PatientUser | null
  /** Sessão carregada? Evita redirecionar antes de ler o armazenamento */
  ready: boolean
  loginWithCpf: (cpf: string, password: string) => Promise<PatientUser>
  registerPatient: (input: { cpf: string; birthDate: string; password: string }) => Promise<PatientUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PatientUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [rawUser, token] = await Promise.all([AsyncStorage.getItem(USER_KEY), tokenStore.get()])
        if (rawUser && token) {
          api.setAuthToken(token)
          const parsed = JSON.parse(rawUser) as PatientUser
          if (alive) setUser(parsed)
        }
      } catch {
        // Sessão corrompida: segue deslogado
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const persistSession = useCallback(async (token: string, sessionUser: PatientUser) => {
    api.setAuthToken(token)
    await Promise.all([
      AsyncStorage.setItem(USER_KEY, JSON.stringify(sessionUser)),
      tokenStore.set(token),
    ])
    setUser(sessionUser)
  }, [])

  const loginWithCpf = useCallback(
    async (cpf: string, password: string) => {
      const response = await api.patientLogin(cpf, password)
      await persistSession(response.token, response.user)
      return response.user
    },
    [persistSession],
  )

  const registerPatient = useCallback(
    async (input: { cpf: string; birthDate: string; password: string }) => {
      const response = await api.patientRegister(input)
      await persistSession(response.token, response.user)
      return response.user
    },
    [persistSession],
  )

  const logout = useCallback(async () => {
    api.setAuthToken(null)
    await Promise.all([AsyncStorage.removeItem(USER_KEY), tokenStore.set(null)])
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, loginWithCpf, registerPatient, logout }),
    [user, ready, loginWithCpf, registerPatient, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return context
}
