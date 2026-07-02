// Requests go through the same-origin /api/* Cloudflare Pages Function
// (see functions/api/[[path]].ts), which attaches the Worker API key
// server-side. No secret is ever shipped to the browser bundle.
const BASE_URL = '/api'

class APIClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const error = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`API error: ${error}`)
    }

    return res.json()
  }

  async getTraces(params: string) {
    return this.fetch(`/traces?${params}`)
  }

  async getMetrics(days: number) {
    return this.fetch(`/metrics?days=${days}`)
  }

  async getAlertRules() {
    return this.fetch('/alerts')
  }

  async createAlertRule(rule: {
    name: string
    metric: string
    windowMinutes: number
    threshold: number
    webhookUrl: string
    cooldownMinutes?: number
  }) {
    return this.fetch('/alerts', { method: 'POST', body: JSON.stringify(rule) })
  }

  async updateAlertRule(id: string, updates: Partial<{
    name: string
    metric: string
    windowMinutes: number
    threshold: number
    webhookUrl: string
    cooldownMinutes: number
    enabled: boolean
  }>) {
    return this.fetch(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  }

  async deleteAlertRule(id: string) {
    return this.fetch(`/alerts/${id}`, { method: 'DELETE' })
  }

  async getAlertEvents(limit = 50) {
    return this.fetch(`/alerts/events?limit=${limit}`)
  }
}

export const api = new APIClient(BASE_URL)
