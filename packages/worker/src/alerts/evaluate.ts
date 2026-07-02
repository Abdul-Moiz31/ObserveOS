import type { AlertRuleRow, Env } from '../types'

const WEBHOOK_TIMEOUT_MS = 5000

async function computeMetricValue(env: Env, rule: AlertRuleRow, since: string): Promise<number> {
  switch (rule.metric) {
    case 'cost_usd': {
      const row = await env.DB.prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) AS value FROM llm_traces WHERE tenant_id = ? AND created_at >= ?`
      )
        .bind(rule.tenant_id, since)
        .first<{ value: number }>()
      return row?.value ?? 0
    }
    case 'error_count': {
      const row = await env.DB.prepare(
        `SELECT COALESCE(SUM(CASE WHEN error = 1 THEN 1 ELSE 0 END), 0) AS value
         FROM llm_traces WHERE tenant_id = ? AND created_at >= ?`
      )
        .bind(rule.tenant_id, since)
        .first<{ value: number }>()
      return row?.value ?? 0
    }
    case 'error_rate': {
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN error = 1 THEN 1 ELSE 0 END) AS errors
         FROM llm_traces WHERE tenant_id = ? AND created_at >= ?`
      )
        .bind(rule.tenant_id, since)
        .first<{ total: number; errors: number | null }>()
      if (!row || row.total === 0) return 0
      return (row.errors ?? 0) / row.total
    }
    case 'latency_p95': {
      const row = await env.DB.prepare(
        `SELECT MAX(CASE WHEN pct <= 0.95 THEN latency_ms END) AS p95
         FROM (
           SELECT latency_ms, PERCENT_RANK() OVER (ORDER BY latency_ms) AS pct
           FROM llm_traces WHERE tenant_id = ? AND created_at >= ?
         )`
      )
        .bind(rule.tenant_id, since)
        .first<{ p95: number | null }>()
      return row?.p95 ?? 0
    }
  }
}

async function inCooldown(env: Env, rule: AlertRuleRow): Promise<boolean> {
  const last = await env.DB.prepare(
    `SELECT triggered_at FROM alert_events WHERE rule_id = ? ORDER BY triggered_at DESC LIMIT 1`
  )
    .bind(rule.id)
    .first<{ triggered_at: string }>()
  if (!last) return false
  const elapsedMs = Date.now() - new Date(last.triggered_at).getTime()
  return elapsedMs < rule.cooldown_minutes * 60_000
}

async function sendWebhook(rule: AlertRuleRow, value: number): Promise<number | null> {
  const message =
    `ObserveOS alert "${rule.name}": ${rule.metric} is ${value} ` +
    `(exceeds threshold ${rule.threshold}) over the last ${rule.window_minutes}m`

  try {
    const res = await fetch(rule.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        content: message, // Discord-compatible alias for `text`
        rule: {
          id: rule.id,
          name: rule.name,
          metric: rule.metric,
          windowMinutes: rule.window_minutes,
          threshold: rule.threshold,
        },
        value,
        tenantId: rule.tenant_id,
        triggeredAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
    return res.status
  } catch {
    return null // delivery failure — still recorded as a firing, just with no status
  }
}

// Evaluates every enabled alert rule across all tenants and fires webhooks for
// any that exceed their threshold and aren't in cooldown. Called from the
// alert-evaluation cron trigger in index.ts (not on the trace-ingest path, to
// keep ingestion fast).
export async function evaluateAlerts(env: Env): Promise<void> {
  const rules = await env.DB.prepare(`SELECT * FROM alert_rules WHERE enabled = 1`).all<AlertRuleRow>()

  for (const rule of rules.results ?? []) {
    const since = new Date(Date.now() - rule.window_minutes * 60_000).toISOString()
    const value = await computeMetricValue(env, rule, since)

    if (value <= rule.threshold) continue
    if (await inCooldown(env, rule)) continue

    const webhookStatus = await sendWebhook(rule, value)

    await env.DB.prepare(
      `INSERT INTO alert_events (id, rule_id, tenant_id, metric_value, threshold, webhook_status, triggered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), rule.id, rule.tenant_id, value, rule.threshold, webhookStatus, new Date().toISOString())
      .run()
  }
}
