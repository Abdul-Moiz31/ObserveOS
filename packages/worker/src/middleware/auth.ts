import type { Env } from '../types'

export async function authenticate(
  request: Request,
  env: Env
): Promise<{ tenantId: string } | Response> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const key = authHeader.slice(7)

  // Simple validation: check against API_KEY_SECRET
  // In production, you would hash the key and look it up in D1
  if (key !== env.API_KEY_SECRET) {
    // Also check X-Tenant-Id for multi-tenant keys
    const tenantKey = `${env.API_KEY_SECRET}:${request.headers.get('X-Tenant-Id') ?? 'default'}`
    if (key !== tenantKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const tenantId = request.headers.get('X-Tenant-Id') ?? 'default'
  return { tenantId }
}
