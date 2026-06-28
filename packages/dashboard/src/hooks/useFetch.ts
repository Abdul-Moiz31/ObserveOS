import { useCallback, useEffect, useState } from 'react'

export interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fn()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)))
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [...deps, tick])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: () => setTick((t) => t + 1) }
}
