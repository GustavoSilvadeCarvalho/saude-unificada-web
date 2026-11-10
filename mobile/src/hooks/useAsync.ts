import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseAsyncResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Recarrega (usado no pull-to-refresh e no botão "Tentar novamente") */
  refresh(): void
}

/**
 * Equivalente mobile do `useApi` do site (frontend/src/hooks/useApi.ts):
 * executa a busca no mount e após `refresh()`, com estados de loading/erro.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  // Sempre guarda a função mais recente antes dos efeitos rodarem
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const value = await fnRef.current()
        if (alive) {
          setData(value)
          setError(null)
        }
      } catch (err: unknown) {
        if (alive) setError(err instanceof Error ? err.message : 'Erro inesperado.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps controlado por cada tela
  }, [...deps, nonce])

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  return { data, loading, error, refresh }
}
