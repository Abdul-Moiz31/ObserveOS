import type { Env } from './types'
import { handleTraces }  from './routes/traces'
import { handleMetrics } from './routes/metrics'
import { handleKeys } from './routes/keys'
import { handleAlerts } from './routes/alerts'
import { evaluateAlerts } from './alerts/evaluate'

const DEFAULT_RETENTION_DAYS = 90
const ALERT_EVAL_CRON = '*/5 * * * *'

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
    if (url.pathname.startsWith('/v1/keys'))    return handleKeys(request, env)
    if (url.pathname.startsWith('/v1/alerts'))  return handleAlerts(request, env)

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  },

  // Two cron triggers share this handler (see wrangler.toml): the daily
  // retention cleanup and the 5-minute alert evaluation. Dispatch on
  // event.cron so each runs its own job.
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    if (event.cron === ALERT_EVAL_CRON) {
      await evaluateAlerts(env)
      return
    }

    const retentionDays = parseInt(env.RETENTION_DAYS ?? '') || DEFAULT_RETENTION_DAYS
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    await env.DB.prepare(`DELETE FROM llm_traces WHERE created_at < ?`).bind(cutoff).run()

    const staleWindow = Math.floor(Date.now() / 60_000) - 24 * 60 // older than a day's worth of windows
    await env.DB.prepare(`DELETE FROM rate_limits WHERE window_start < ?`).bind(staleWindow).run()
  },
}
