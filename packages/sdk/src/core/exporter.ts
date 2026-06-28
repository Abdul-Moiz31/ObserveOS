import type { LLMTrace, ObserveOSConfig } from '../types/trace'

export class Exporter {
  private config: Required<ObserveOSConfig>

  constructor(config: Required<ObserveOSConfig>) {
    this.config = config
  }

  async export(traces: LLMTrace[]): Promise<void> {
    // Primary: send to our Worker ingestion endpoint
    await this.sendToWorker(traces)

    // Secondary: send to OTEL collector if configured
    if (this.config.otelEndpoint) {
      await this.sendToOtel(traces).catch((err) => {
        if (this.config.debug) console.error('[ObserveOS] OTEL export failed:', err.message)
      })
    }
  }

  private async sendToWorker(traces: LLMTrace[]): Promise<void> {
    const payload = traces.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }))

    const res = await fetch(`${this.config.baseUrl}/v1/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Tenant-Id': this.config.tenantId,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error')
      if (this.config.debug) {
        console.error(`[ObserveOS] Ingestion failed: ${res.status} ${text}`)
      }
    } else if (this.config.debug) {
      console.log(`[ObserveOS] Flushed ${traces.length} traces`)
    }
  }

  private async sendToOtel(traces: LLMTrace[]): Promise<void> {
    // Convert to OTEL ResourceSpans format
    const spans = traces.map((t) => ({
      traceId: t.traceId,
      spanId: t.spanId,
      parentSpanId: t.parentSpanId,
      name: `${t.provider}.chat`,
      kind: 3, // CLIENT
      startTimeUnixNano: (t.createdAt.getTime() - t.latencyMs) * 1_000_000,
      endTimeUnixNano: t.createdAt.getTime() * 1_000_000,
      attributes: [
        { key: 'gen_ai.system',               value: { stringValue: t.provider } },
        { key: 'gen_ai.request.model',         value: { stringValue: t.model } },
        { key: 'gen_ai.usage.input_tokens',    value: { intValue: t.promptTokens ?? 0 } },
        { key: 'gen_ai.usage.output_tokens',   value: { intValue: t.completionTokens ?? 0 } },
        { key: 'observeos.cost_usd',           value: { doubleValue: t.costUsd ?? 0 } },
        { key: 'observeos.tenant_id',          value: { stringValue: t.tenantId } },
        { key: 'observeos.prompt_hash',        value: { stringValue: t.promptHash } },
        { key: 'error',                        value: { boolValue: t.error } },
      ],
      status: t.error ? { code: 2 } : { code: 1 },
    }))

    await fetch(`${this.config.otelEndpoint}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
    })
  }
}
