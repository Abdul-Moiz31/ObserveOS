import type { ApiKeyRow, AuthContext, Env } from '../types'
import { sha256Hex } from '../utils/hash'

export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const key = authHeader.slice(7).trim()
  if (!key) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const keyHash = await sha256Hex(key)

  const row = await env.DB.prepare(
    `SELECT id, tenant_id, key_prefix, key_hash, name, created_at, last_used_at, revoked
     FROM api_keys WHERE key_hash = ?`
  )
    .bind(keyHash)
    .first<ApiKeyRow>()

  if (!row || row.revoked) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Best-effort last-used timestamp update (awaited — Workers may cancel
  // unawaited promises once the response is returned).
  try {
    await env.DB.prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), row.id)
      .run()
  } catch {
    // non-critical, ignore
  }

  return { tenantId: row.tenant_id, keyId: row.id, keyHash: row.key_hash }
}

export function requireAdmin(request: Request, env: Env): Response | null {
  const authHeader = request.headers.get('Authorization')
  const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!env.ADMIN_SECRET || key !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return null
}
