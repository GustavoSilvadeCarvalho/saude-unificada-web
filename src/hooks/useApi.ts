import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string
  reload: () => void
}

/** Executa uma chamada da API ao montar (e quando as dependências mudam) */
export function useApi<T>(fetcher: () => Promise<T>, deps: DependencyList): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const run = useCallback(fetcher, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    run()
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Erro inesperado.'))
      .finally(() => active && setLoading(false))
    // Ignora respostas de requisições antigas
    return () => {
      active = false
    }
  }, [run, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, loading, error, reload }
}
