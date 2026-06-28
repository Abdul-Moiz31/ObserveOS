import { describe, it, expect } from 'vitest'
import { calculateCost } from '../utils/cost'

describe('calculateCost', () => {
  it('calculates gpt-4o correctly', () => {
    // 1000 input @ $2.50/1M + 500 output @ $10/1M = 0.0025 + 0.005 = 0.0075
    expect(calculateCost('gpt-4o', 1000, 500)).toBe(0.00750000)
  })

  it('calculates claude-3-5-sonnet correctly', () => {
    // 1000 input @ $3/1M + 500 output @ $15/1M = 0.003 + 0.0075 = 0.0105
    expect(calculateCost('claude-3-5-sonnet-20241022', 1000, 500)).toBe(0.01050000)
  })

  it('returns 0 for ollama (self-hosted)', () => {
    expect(calculateCost('llama3', 5000, 2000)).toBe(0)
  })

  it('returns 0 for unknown model', () => {
    expect(calculateCost('some-unknown-model', 1000, 500)).toBe(0)
  })

  it('handles zero tokens without NaN', () => {
    expect(calculateCost('gpt-4o', 0, 0)).toBe(0)
  })
})
