import type { ApiKeyRow, Env } from '../types'
import { requireAdmin } from '../middleware/auth'
import { generateApiKey, sha256Hex } from '../utils/hash'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() })
}

export async function handleKeys(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const denied = requireAdmin(request, env)
  if (denied) return denied

  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean) // ['v1', 'keys', maybe id]
  const keyId = segments[2]

  if (request.method === 'POST' && !keyId) {
    let body: { tenantId?: string; name?: string }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const tenantId = body.tenantId?.trim()
    const name = body.name?.trim()
    if (!tenantId || !name) {
      return jsonResponse({ error: 'tenantId and name are required' }, 400)
    }

    const rawKey = generateApiKey()
    const keyHash = await sha256Hex(rawKey)
    const id = crypto.randomUUID()

    await env.DB.prepare(
      `INSERT INTO api_keys (id, tenant_id, key_prefix, key_hash, name, created_at, revoked)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(id, tenantId, rawKey.slice(0, 12), keyHash, name, new Date().toISOString())
      .run()

    // The raw key is only ever returned here — only the hash is stored.
    return jsonResponse({ id, tenantId, name, apiKey: rawKey, keyPrefix: rawKey.slice(0, 12) }, 201)
  }

  if (request.method === 'GET' && !keyId) {
    const result = await env.DB.prepare(
      `SELECT id, tenant_id, key_prefix, name, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC`
    ).all<Omit<ApiKeyRow, 'key_hash'>>()
    return jsonResponse({ keys: result.results })
  }

  if (request.method === 'DELETE' && keyId) {
    await env.DB.prepare(`UPDATE api_keys SET revoked = 1 WHERE id = ?`).bind(keyId).run()
    return jsonResponse({ revoked: true, id: keyId })
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
}
