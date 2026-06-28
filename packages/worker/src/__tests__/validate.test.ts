import { describe, it, expect } from 'vitest'
import { validateTrace } from '../utils/validate'

function validTrace(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'openai',
    model: 'gpt-4o',
    promptHash: 'abc123',
    latencyMs: 120,
    ...overrides,
  }
}

describe('validateTrace', () => {
  it('accepts a minimal valid trace', () => {
    const result = validateTrace(validTrace())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects non-object input', () => {
    expect(validateTrace('not an object').valid).toBe(false)
    expect(validateTrace(null).valid).toBe(false)
    expect(validateTrace([1, 2, 3]).valid).toBe(false)
  })

  it('rejects an unknown provider', () => {
    const result = validateTrace(validTrace({ provider: 'made-up-provider' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('provider'))).toBe(true)
  })

  it('rejects missing model', () => {
    const trace = validTrace()
    delete (trace as Record<string, unknown>).model
    const result = validateTrace(trace)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('model'))).toBe(true)
  })

  it('rejects negative latencyMs', () => {
    const result = validateTrace(validTrace({ latencyMs: -5 }))
    expect(result.valid).toBe(false)
  })

  it('rejects malformed traceId/spanId', () => {
    const result = validateTrace(validTrace({ traceId: 'not-hex!!', spanId: 'zzzz' }))
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(2)
  })

  it('rejects oversized metadata', () => {
    const big: Record<string, string> = {}
    for (let i = 0; i < 2000; i++) big[`key${i}`] = 'x'.repeat(20)
    const result = validateTrace(validTrace({ metadata: big }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('metadata'))).toBe(true)
  })

  it('rejects non-object tags', () => {
    const result = validateTrace(validTrace({ tags: 'oops' }))
    expect(result.valid).toBe(false)
  })

  it('accepts optional fields when well-formed', () => {
    const result = validateTrace(
      validTrace({
        traceId: 'abcdef0123456789',
        spanId: 'abcdef01',
        promptTokens: 10,
        completionTokens: 20,
        costUsd: 0.0012,
        error: true,
        errorMessage: 'rate limited',
        tags: { env: 'prod' },
        metadata: { retries: 1 },
      })
    )
    expect(result.valid).toBe(true)
  })
})
