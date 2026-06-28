import type { Env } from '../types'
import { authenticate } from '../middleware/auth'
import { checkRateLimit, rateLimitResponse } from '../middleware/rateLimit'

const QUERY_LIMIT_PER_MIN = 300

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }
}

export async function handleMetrics(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })

  const auth = await authenticate(request, env)
  if (auth instanceof Response) return auth

  const { allowed } = await checkRateLimit(env, auth.keyHash, QUERY_LIMIT_PER_MIN)
  if (!allowed) return rateLimitResponse(corsHeaders())

  const url  = new URL(request.url)
  const daysParam = parseInt(url.searchParams.get('days') ?? '7')
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 7
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [summary, byModel, byProvider, errorRate, latencyPct] = await Promise.all([
      // Total summary
      env.DB.prepare(`
        SELECT
          COUNT(*) AS total_calls,
          SUM(total_tokens) AS total_tokens,
          SUM(cost_usd) AS total_cost_usd,
          AVG(latency_ms) AS avg_latency_ms,
          SUM(CASE WHEN error = 1 THEN 1 ELSE 0 END) AS total_errors
        FROM llm_traces
        WHERE tenant_id = ? AND created_at >= ?
      `).bind(auth.tenantId, from).first(),

      // Breakdown by model
      env.DB.prepare(`
        SELECT model, provider,
          COUNT(*) AS calls,
          SUM(cost_usd) AS cost_usd,
          AVG(latency_ms) AS avg_latency_ms
        FROM llm_traces
        WHERE tenant_id = ? AND created_at >= ?
        GROUP BY model, provider
        ORDER BY cost_usd DESC
      `).bind(auth.tenantId, from).all(),

      // Breakdown by provider
      env.DB.prepare(`
        SELECT provider,
          COUNT(*) AS calls,
          SUM(cost_usd) AS cost_usd
        FROM llm_traces
        WHERE tenant_id = ? AND created_at >= ?
        GROUP BY provider
      `).bind(auth.tenantId, from).all(),

      // Error rate by day
      env.DB.prepare(`
        SELECT
          date(created_at) AS day,
          COUNT(*) AS total,
          SUM(CASE WHEN error = 1 THEN 1 ELSE 0 END) AS errors
        FROM llm_traces
        WHERE tenant_id = ? AND created_at >= ?
        GROUP BY day ORDER BY day DESC
      `).bind(auth.tenantId, from).all(),

      // Latency percentiles (approximate using SQLite)
      env.DB.prepare(`
        SELECT
          AVG(latency_ms) AS p50,
          MAX(CASE WHEN pct <= 0.95 THEN latency_ms END) AS p95,
          MAX(latency_ms) AS p99
        FROM (
          SELECT latency_ms,
            PERCENT_RANK() OVER (ORDER BY latency_ms) AS pct
          FROM llm_traces
          WHERE tenant_id = ? AND created_at >= ?
        )
      `).bind(auth.tenantId, from).first(),
    ])

    return new Response(JSON.stringify({
      summary,
      byModel: byModel.results,
      byProvider: byProvider.results,
      errorRateByDay: errorRate.results,
      latencyPercentiles: latencyPct,
      period: { days, from },
    }), { headers: corsHeaders() })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: corsHeaders(),
    })
  }
}
