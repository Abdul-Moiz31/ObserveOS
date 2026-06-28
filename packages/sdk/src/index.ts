export { ObserveOSTracer } from './core/tracer'
export { Exporter }        from './core/exporter'
export { wrapOpenAI }      from './providers/openai'
export { wrapAnthropic }   from './providers/anthropic'
export { wrapOllama }      from './providers/ollama'
export { wrapHuggingFace } from './providers/huggingface'
export { hashPrompt }      from './utils/hash'
export { calculateCost, getModelPricing, MODEL_PRICING } from './utils/cost'

export type {
  LLMTrace,
  LLMProvider,
  FinishReason,
  ObserveOSConfig,
  TraceInput,
} from './types/trace'

// ─── Convenience factory ────────────────────────────────────────────────────

import { ObserveOSTracer } from './core/tracer'
import { wrapOpenAI }      from './providers/openai'
import { wrapAnthropic }   from './providers/anthropic'
import { wrapOllama }      from './providers/ollama'
import { wrapHuggingFace } from './providers/huggingface'
import type { ObserveOSConfig } from './types/trace'

export interface ObserveOSInstance {
  tracer: ObserveOSTracer
  wrapOpenAI: <T extends import('openai').default>(client: T) => T
  wrapAnthropic: <T extends import('@anthropic-ai/sdk').default>(client: T) => T
  wrapOllama: (fetchFn: typeof fetch) => typeof fetch
  wrapHuggingFace: <T extends object>(client: T) => T
}

export function createObserveOS(config: ObserveOSConfig): ObserveOSInstance {
  const tracer = new ObserveOSTracer(config)

  return {
    tracer,
    wrapOpenAI:      (client) => wrapOpenAI(client, tracer),
    wrapAnthropic:   (client) => wrapAnthropic(client, tracer),
    wrapOllama:      (fetchFn) => wrapOllama(fetchFn, tracer),
    wrapHuggingFace: (client) => wrapHuggingFace(client, tracer),
  }
}
