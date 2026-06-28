import { describe, it, expect } from 'vitest'
import { sha256Hex, generateApiKey } from '../utils/hash'

describe('sha256Hex', () => {
  it('produces a stable 64-char hex digest', async () => {
    const hash = await sha256Hex('hello world')
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('produces different hashes for different inputs', async () => {
    const a = await sha256Hex('foo')
    const b = await sha256Hex('bar')
    expect(a).not.toBe(b)
  })
})

describe('generateApiKey', () => {
  it('is prefixed with obs_ and unique per call', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.startsWith('obs_')).toBe(true)
    expect(a).not.toBe(b)
    expect(a.length).toBe('obs_'.length + 48)
  })
})
