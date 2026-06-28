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
}

export const api = new APIClient(BASE_URL)
