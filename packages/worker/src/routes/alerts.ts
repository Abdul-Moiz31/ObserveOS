import type { AlertEventRow, AlertRuleRow, Env } from '../types'
import { authenticate } from '../middleware/auth'
import { checkRateLimit, rateLimitResponse } from '../middleware/rateLimit'
import { validateAlertRule, validateAlertRuleUpdate } from '../utils/validateAlert'

const QUERY_LIMIT_PER_MIN = 300
const MUTATE_LIMIT_PER_MIN = 60

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
    'Content-Type': 'application/json',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() })
}

export async function handleAlerts(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const auth = await authenticate(request, env)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean) // ['v1', 'alerts', maybe 'events' or an id]
  const sub = segments[2]

  // GET /v1/alerts/events — recent firing history for the tenant
  if (request.method === 'GET' && sub === 'events') {
    const { allowed } = await checkRateLimit(env, auth.keyHash, QUERY_LIMIT_PER_MIN)
    if (!allowed) return rateLimitResponse(corsHeaders())

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50') || 50, 200)
    const result = await env.DB.prepare(
      `SELECT * FROM alert_events WHERE tenant_id = ? ORDER BY triggered_at DESC LIMIT ?`
    )
      .bind(auth.tenantId, limit)
      .all<AlertEventRow>()
    return jsonResponse({ events: result.results })
  }

  const ruleId = sub && sub !== 'events' ? sub : undefined

  // POST /v1/alerts — create a rule
  if (request.method === 'POST' && !ruleId) {
    const { allowed } = await checkRateLimit(env, auth.keyHash, MUTATE_LIMIT_PER_MIN)
    if (!allowed) return rateLimitResponse(corsHeaders())

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { valid, errors } = validateAlertRule(body)
    if (!valid) return jsonResponse({ error: 'Invalid alert rule', details: errors }, 400)

    const b = body as Record<string, unknown>
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await env.DB.prepare(
      `INSERT INTO alert_rules
         (id, tenant_id, name, metric, window_minutes, threshold, webhook_url, cooldown_minutes, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(
        id,
        auth.tenantId,
        b.name,
        b.metric,
        b.windowMinutes,
        b.threshold,
        b.webhookUrl,
        b.cooldownMinutes ?? 60,
        now,
        now
      )
      .run()

    const row = await env.DB.prepare(`SELECT * FROM alert_rules WHERE id = ?`).bind(id).first<AlertRuleRow>()
    return jsonResponse(row, 201)
  }

  // GET /v1/alerts — list the tenant's rules
  if (request.method === 'GET' && !ruleId) {
    const { allowed } = await checkRateLimit(env, auth.keyHash, QUERY_LIMIT_PER_MIN)
    if (!allowed) return rateLimitResponse(corsHeaders())

    const result = await env.DB.prepare(
      `SELECT * FROM alert_rules WHERE tenant_id = ? ORDER BY created_at DESC`
    )
      .bind(auth.tenantId)
      .all<AlertRuleRow>()
    return jsonResponse({ rules: result.results })
  }

  // PATCH /v1/alerts/:id — edit a rule
  if (request.method === 'PATCH' && ruleId) {
    const { allowed } = await checkRateLimit(env, auth.keyHash, MUTATE_LIMIT_PER_MIN)
    if (!allowed) return rateLimitResponse(corsHeaders())

    const existing = await env.DB.prepare(`SELECT * FROM alert_rules WHERE id = ? AND tenant_id = ?`)
      .bind(ruleId, auth.tenantId)
      .first<AlertRuleRow>()
    if (!existing) return jsonResponse({ error: 'Alert rule not found' }, 404)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { valid, errors } = validateAlertRuleUpdate(body)
    if (!valid) return jsonResponse({ error: 'Invalid update', details: errors }, 400)

    const b = body as Record<string, unknown>
    const next = {
      name: (b.name as string | undefined) ?? existing.name,
      metric: (b.metric as string | undefined) ?? existing.metric,
      window_minutes: (b.windowMinutes as number | undefined) ?? existing.window_minutes,
      threshold: (b.threshold as number | undefined) ?? existing.threshold,
      webhook_url: (b.webhookUrl as string | undefined) ?? existing.webhook_url,
      cooldown_minutes: (b.cooldownMinutes as number | undefined) ?? existing.cooldown_minutes,
      enabled: b.enabled !== undefined ? (b.enabled ? 1 : 0) : existing.enabled,
    }

    await env.DB.prepare(
      `UPDATE alert_rules
       SET name = ?, metric = ?, window_minutes = ?, threshold = ?, webhook_url = ?, cooldown_minutes = ?, enabled = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(
        next.name,
        next.metric,
        next.window_minutes,
        next.threshold,
        next.webhook_url,
        next.cooldown_minutes,
        next.enabled,
        new Date().toISOString(),
        ruleId,
        auth.tenantId
      )
      .run()

    const row = await env.DB.prepare(`SELECT * FROM alert_rules WHERE id = ?`).bind(ruleId).first<AlertRuleRow>()
    return jsonResponse(row)
  }

  // DELETE /v1/alerts/:id — remove a rule
  if (request.method === 'DELETE' && ruleId) {
    const { allowed } = await checkRateLimit(env, auth.keyHash, MUTATE_LIMIT_PER_MIN)
    if (!allowed) return rateLimitResponse(corsHeaders())

    const result = await env.DB.prepare(`DELETE FROM alert_rules WHERE id = ? AND tenant_id = ?`)
      .bind(ruleId, auth.tenantId)
      .run()
    if (result.meta.changes === 0) return jsonResponse({ error: 'Alert rule not found' }, 404)

    return jsonResponse({ deleted: true, id: ruleId })
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
}
