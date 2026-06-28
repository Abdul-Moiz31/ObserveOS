import { describe, it, expect } from 'vitest'
import { windowStart } from '../middleware/rateLimit'

describe('windowStart', () => {
  it('buckets timestamps into 1-minute windows', () => {
    const base = Date.UTC(2026, 0, 1, 0, 0, 0)
    expect(windowStart(base)).toBe(windowStart(base + 59_000))
    expect(windowStart(base)).not.toBe(windowStart(base + 60_000))
  })

  it('increases monotonically with time', () => {
    const a = windowStart(Date.now())
    const b = windowStart(Date.now() + 5 * 60_000)
    expect(b).toBeGreaterThan(a)
  })
})
