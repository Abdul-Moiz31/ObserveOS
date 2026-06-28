const BASE_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:8787'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? ''

class APIClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Tenant-Id': 'default',
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
    return this.fetch(`/v1/traces?${params}`)
  }

  async getMetrics(days: number) {
    return this.fetch(`/v1/metrics?days=${days}`)
  }
}

export const api = new APIClient(BASE_URL, API_KEY)
