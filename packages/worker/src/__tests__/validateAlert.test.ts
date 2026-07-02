import { describe, it, expect } from 'vitest'
import { validateAlertRule, validateAlertRuleUpdate } from '../utils/validateAlert'

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    name: 'High cost',
    metric: 'cost_usd',
    windowMinutes: 60,
    threshold: 10,
    webhookUrl: 'https://hooks.example.com/abc',
    ...overrides,
  }
}

describe('validateAlertRule', () => {
  it('accepts a minimal valid rule', () => {
    const result = validateAlertRule(validRule())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects non-object input', () => {
    expect(validateAlertRule('nope').valid).toBe(false)
    expect(validateAlertRule(null).valid).toBe(false)
    expect(validateAlertRule([1, 2]).valid).toBe(false)
  })

  it('rejects an unknown metric', () => {
    const result = validateAlertRule(validRule({ metric: 'made-up-metric' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('metric'))).toBe(true)
  })

  it('rejects windowMinutes outside 5-1440', () => {
    expect(validateAlertRule(validRule({ windowMinutes: 1 })).valid).toBe(false)
    expect(validateAlertRule(validRule({ windowMinutes: 5000 })).valid).toBe(false)
    expect(validateAlertRule(validRule({ windowMinutes: 60.5 })).valid).toBe(false)
  })

  it('rejects a non-positive threshold', () => {
    expect(validateAlertRule(validRule({ threshold: 0 })).valid).toBe(false)
    expect(validateAlertRule(validRule({ threshold: -5 })).valid).toBe(false)
  })

  it('rejects a malformed or non-http webhook URL', () => {
    expect(validateAlertRule(validRule({ webhookUrl: 'not-a-url' })).valid).toBe(false)
    expect(validateAlertRule(validRule({ webhookUrl: 'ftp://example.com/x' })).valid).toBe(false)
  })

  it('accepts an explicit cooldownMinutes within range', () => {
    const result = validateAlertRule(validRule({ cooldownMinutes: 120 }))
    expect(result.valid).toBe(true)
  })

  it('rejects cooldownMinutes outside 5-1440', () => {
    expect(validateAlertRule(validRule({ cooldownMinutes: 1 })).valid).toBe(false)
  })
})

describe('validateAlertRuleUpdate', () => {
  it('accepts an empty update', () => {
    const result = validateAlertRuleUpdate({})
    expect(result.valid).toBe(true)
  })

  it('accepts a partial well-formed update', () => {
    const result = validateAlertRuleUpdate({ enabled: false, threshold: 25 })
    expect(result.valid).toBe(true)
  })

  it('rejects a malformed field even when others are omitted', () => {
    const result = validateAlertRuleUpdate({ threshold: -1 })
    expect(result.valid).toBe(false)
  })

  it('rejects a non-boolean enabled', () => {
    const result = validateAlertRuleUpdate({ enabled: 'yes' })
    expect(result.valid).toBe(false)
  })
})
