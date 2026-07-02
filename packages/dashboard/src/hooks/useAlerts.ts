import { api } from '@/lib/api'
import type { AlertEvent, AlertRule } from '@/lib/types'
import { useFetch } from './useFetch'

export function useAlertRules() {
  return useFetch<{ rules: AlertRule[] }>(() => api.getAlertRules(), [])
}

export function useAlertEvents(limit = 50) {
  return useFetch<{ events: AlertEvent[] }>(() => api.getAlertEvents(limit), [limit])
}
