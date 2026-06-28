import { randomUUID } from 'crypto'
import type { LLMTrace, ObserveOSConfig, TraceInput } from '../types/trace'
import { Exporter } from './exporter'

const DEFAULTS: Required<ObserveOSConfig> = {
  apiKey: '',
  baseUrl: 'http://localhost:8787',
  tenantId: 'default',
  environment: 'production',
  enabled: true,
  sampleRate: 1,
  capturePromptPreview: true,
  captureResponsePreview: true,
  piiScrubbing: false,
  flushInterval: 5000,
  maxBatchSize: 50,
  otelEndpoint: '',
  debug: false,
}

export class ObserveOSTracer {
  readonly config: Required<ObserveOSConfig>
  private readonly exporter: Exporter
  private queue: LLMTrace[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private flushing = false

  constructor(config: ObserveOSConfig) {
    this.config = { ...DEFAULTS, ...config }
    this.exporter = new Exporter(this.config)
    this.startFlushTimer()
  }

  async record(input: TraceInput): Promise<void> {
    if (!this.config.enabled) return
    if (Math.random() > this.config.sampleRate) return

    const trace: LLMTrace = {
      ...input,
      traceId: randomUUID().replace(/-/g, ''),
      spanId: randomUUID().replace(/-/g, '').slice(0, 16),
      createdAt: new Date(),
    }

    this.queue.push(trace)

    if (this.config.debug) {
      console.log(`[ObserveOS] Queued trace: ${trace.provider}/${trace.model} (${input.latencyMs}ms)`)
    }

    if (this.queue.length >= this.config.maxBatchSize) {
      // Fire and forget — do not block caller
      this.flush().catch((err) => {
        if (this.config.debug) console.error('[ObserveOS] Flush error:', err.message)
      })
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return
    this.flushing = true

    const batch = this.queue.splice(0)
    try {
      await this.exporter.export(batch)
    } finally {
      this.flushing = false
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {})
    }, this.config.flushInterval)

    // Do not prevent process exit
    if (this.flushTimer.unref) this.flushTimer.unref()
  }
}
