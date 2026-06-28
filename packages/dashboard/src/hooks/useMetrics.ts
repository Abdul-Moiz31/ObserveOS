import { api } from '@/lib/api'
import type { Metrics } from '@/lib/types'
import { useFetch } from './useFetch'

export function useMetrics(days: number) {
  return useFetch<Metrics>(() => api.getMetrics(days), [days])
}
