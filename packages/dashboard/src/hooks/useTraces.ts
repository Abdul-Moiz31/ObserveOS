import { api } from '@/lib/api'
import type { Trace } from '@/lib/types'
import { useFetch } from './useFetch'

export interface UseTracesOptions {
  provider?: string
  errorOnly?: boolean
  page?: number
  limit?: number
}

export function useTraces(options: UseTracesOptions) {
  const { provider = '', errorOnly = false, page = 0, limit = 50 } = options

  return useFetch<Trace[]>(() => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
      ...(provider ? { provider } : {}),
      ...(errorOnly ? { error: 'true' } : {}),
    })
    return api.getTraces(params.toString())
  }, [provider, errorOnly, page, limit])
}
