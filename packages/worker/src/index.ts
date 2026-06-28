import type { Env } from './types'
import { handleTraces }  from './routes/traces'
import { handleMetrics } from './routes/metrics'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Health check — no auth required
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Route
    if (url.pathname.startsWith('/v1/traces'))  return handleTraces(request, env)
    if (url.pathname.startsWith('/v1/metrics')) return handleMetrics(request, env)

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}
