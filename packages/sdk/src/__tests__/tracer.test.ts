import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ObserveOSTracer } from '../core/tracer'

vi.mock('../core/exporter', () => ({
  Exporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('ObserveOSTracer', () => {
  let tracer: ObserveOSTracer

  beforeEach(() => {
    tracer = new ObserveOSTracer({
      apiKey: 'test_key',
      baseUrl: 'http://localhost:8787',
      tenantId: 'test_tenant',
      flushInterval: 999_999,
      debug: false,
    })
  })

  afterEach(async () => {
    await tracer.shutdown()
  })

  it('queues a trace with correct fields', async () => {
    await tracer.record({
      tenantId: 'test_tenant',
      provider: 'openai',
      model: 'gpt-4o',
      promptHash: 'abc123',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      latencyMs: 450,
      costUsd: 0.00175,
      error: false,
      tags: {},
      metadata: {},
      environment: 'test',
    })

    expect(tracer['queue'].length).toBe(1)
    const t = tracer['queue'][0]
    expect(t.traceId).toHaveLength(32)
    expect(t.spanId).toHaveLength(16)
    expect(t.provider).toBe('openai')
    expect(t.model).toBe('gpt-4o')
    expect(t.costUsd).toBe(0.00175)
  })

  it('does not queue when disabled', async () => {
    const off = new ObserveOSTracer({ apiKey: 'x', enabled: false })
    await off.record({ tenantId: 't', provider: 'openai', model: 'gpt-4o', promptHash: 'h', latencyMs: 100, error: false, tags: {}, metadata: {}, environment: 'test' })
    expect(off['queue'].length).toBe(0)
    await off.shutdown()
  })

  it('respects sampleRate: 0 drops all traces', async () => {
    const zero = new ObserveOSTracer({ apiKey: 'x', sampleRate: 0 })
    for (let i = 0; i < 100; i++) {
      await zero.record({ tenantId: 't', provider: 'openai', model: 'gpt-4o', promptHash: `h${i}`, latencyMs: 100, error: false, tags: {}, metadata: {}, environment: 'test' })
    }
    expect(zero['queue'].length).toBe(0)
    await zero.shutdown()
  })

  it('flushes queue and calls exporter', async () => {
    const exportSpy = vi.spyOn(tracer['exporter'], 'export').mockResolvedValue()

    await tracer.record({ tenantId: 't', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', promptHash: 'xyz', latencyMs: 200, error: false, tags: {}, metadata: {}, environment: 'test' })
    await tracer.flush()

    expect(exportSpy).toHaveBeenCalledTimes(1)
    expect(tracer['queue'].length).toBe(0)
  })

  it('clears queue on shutdown', async () => {
    await tracer.record({ tenantId: 't', provider: 'ollama', model: 'llama3', promptHash: 'abc', latencyMs: 80, error: false, costUsd: 0, tags: {}, metadata: {}, environment: 'test' })
    await tracer.shutdown()
    expect(tracer['queue'].length).toBe(0)
  })
})
