export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'huggingface'

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'error' | 'content_filter' | string

export interface LLMTrace {
  // Identity
  traceId: string          // UUID v4, no hyphens
  spanId: string           // 16-char hex
  parentSpanId?: string    // for nested LLM calls
  tenantId: string

  // Provider info
  provider: LLMProvider
  model: string

  // Prompt data (privacy-safe)
  promptHash: string       // SHA-256 of normalized prompt
  promptPreview?: string   // first 200 chars (opt-out available)
  promptTokens?: number

  // Response data
  completionTokens?: number
  totalTokens?: number
  responsePreview?: string
  finishReason?: FinishReason

  // Performance
  latencyMs: number
  ttfbMs?: number          // time to first byte (streaming only)

  // Cost
  costUsd?: number         // calculated from token counts + model pricing

  // Error state
  error: boolean
  errorMessage?: string
  statusCode?: number

  // Context
  tags: Record<string, string>
  metadata: Record<string, unknown>
  environment: string

  createdAt: Date
}

export interface ObserveOSConfig {
  apiKey: string
  baseUrl?: string                  // default: http://localhost:8787
  tenantId?: string                 // default: 'default'
  environment?: string              // default: 'production'
  enabled?: boolean                 // default: true
  sampleRate?: number               // 0-1, default: 1
  capturePromptPreview?: boolean    // default: true
  captureResponsePreview?: boolean  // default: true
  piiScrubbing?: boolean            // default: false
  flushInterval?: number            // ms, default: 5000
  maxBatchSize?: number             // default: 50
  otelEndpoint?: string             // optional OTEL collector
  debug?: boolean                   // log SDK activity
}

export type TraceInput = Omit<LLMTrace, 'traceId' | 'spanId' | 'createdAt'>
