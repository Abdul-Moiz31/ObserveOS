import type { Env, TraceRow } from '../types'
import { authenticate } from '../middleware/auth'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
    'Content-Type': 'application/json',
  }
}

export async function handleTraces(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const auth = await authenticate(request, env)
  if (auth instanceof Response) return auth

  // POST /v1/traces — batch ingest
  if (request.method === 'POST') {
    let body: any[]
    try {
      const raw = await request.json()
      body = Array.isArray(raw) ? raw : [raw]
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: corsHeaders(),
      })
    }

    if (body.length === 0) {
      return new Response(JSON.stringify({ error: 'Empty batch' }), {
        status: 400,
        headers: corsHeaders(),
      })
    }

    if (body.length > 100) {
      return new Response(JSON.stringify({ error: 'Max 100 traces per batch' }), {
        status: 400,
        headers: corsHeaders(),
      })
    }

    try {
      // D1 batch insert using prepared statement
      const stmt = env.DB.prepare(`
        INSERT INTO llm_traces (
          id, trace_id, span_id, parent_span_id, tenant_id,
          provider, model, prompt_hash, prompt_preview,
          prompt_tokens, completion_tokens, total_tokens,
          response_preview, finish_reason,
          latency_ms, ttfb_ms, cost_usd,
          error, error_message, status_code,
          tags, metadata, environment, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )
      `)

      const inserts = body.map((trace: any) =>
        stmt.bind(
          crypto.randomUUID(),
          trace.traceId   ?? crypto.randomUUID().replace(/-/g, ''),
          trace.spanId    ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16),
          trace.parentSpanId ?? null,
          auth.tenantId,
          trace.provider,
          trace.model,
          trace.promptHash,
          trace.promptPreview   ?? null,
          trace.promptTokens    ?? null,
          trace.completionTokens ?? null,
          trace.totalTokens     ?? null,
          trace.responsePreview ?? null,
          trace.finishReason    ?? null,
          trace.latencyMs,
          trace.ttfbMs          ?? null,
          trace.costUsd         ?? null,
          trace.error ? 1 : 0,
          trace.errorMessage    ?? null,
          trace.statusCode      ?? null,
          JSON.stringify(trace.tags     ?? {}),
          JSON.stringify(trace.metadata ?? {}),
          trace.environment     ?? env.ENVIRONMENT,
          trace.createdAt       ?? new Date().toISOString()
        )
      )

      await env.DB.batch(inserts)

      return new Response(JSON.stringify({ inserted: body.length }), {
        status: 201,
        headers: corsHeaders(),
      })
    } catch (err: any) {
      console.error('D1 insert error:', err)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: corsHeaders(),
      })
    }
  }

  // GET /v1/traces — query
  if (request.method === 'GET') {
    const url    = new URL(request.url)
    const limit  = Math.min(parseInt(url.searchParams.get('limit')  ?? '50'), 200)
    const offset = parseInt(url.searchParams.get('offset') ?? '0')
    const provider   = url.searchParams.get('provider')
    const model      = url.searchParams.get('model')
    const errorOnly  = url.searchParams.get('error') === 'true'
    const from       = url.searchParams.get('from')
    const to         = url.searchParams.get('to')

    const conditions = ['tenant_id = ?']
    const values: any[] = [auth.tenantId]

    if (provider)  { conditions.push('provider = ?');       values.push(provider) }
    if (model)     { conditions.push('model = ?');          values.push(model) }
    if (errorOnly) { conditions.push('error = 1') }
    if (from)      { conditions.push('created_at >= ?');    values.push(from) }
    if (to)        { conditions.push('created_at <= ?');    values.push(to) }

    values.push(limit, offset)

    try {
      const result = await env.DB.prepare(
        `SELECT * FROM llm_traces
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      ).bind(...values).all<TraceRow>()

      return new Response(JSON.stringify(result.results), {
        headers: corsHeaders(),
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: corsHeaders(),
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders(),
  })
}
