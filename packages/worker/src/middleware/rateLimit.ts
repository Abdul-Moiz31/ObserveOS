import type { Env } from '../types'

const WINDOW_MS = 60_000

export function windowStart(now: number): number {
  return Math.floor(now / WINDOW_MS)
}

/**
 * Fixed-window rate limiter backed by D1. Approximate (no cross-row locking),
 * which is an acceptable tradeoff for a self-hosted ingestion API at this scale.
 */
export async function checkRateLimit(
  env: Env,
  keyHash: string,
  limitPerMinute: number
): Promise<{ allowed: boolean; remaining: number }> {
  const window = windowStart(Date.now())

  await env.DB.prepare(
    `INSERT INTO rate_limits (key_hash, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(key_hash, window_start) DO UPDATE SET count = count + 1`
  )
    .bind(keyHash, window)
    .run()

  const row = await env.DB.prepare(
    `SELECT count FROM rate_limits WHERE key_hash = ? AND window_start = ?`
  )
    .bind(keyHash, window)
    .first<{ count: number }>()

  const count = row?.count ?? 1
  return { allowed: count <= limitPerMinute, remaining: Math.max(0, limitPerMinute - count) }
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { ...corsHeaders, 'Retry-After': '60' },
  })
}
