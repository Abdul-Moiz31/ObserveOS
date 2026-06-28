import { ObserveOSTracer } from '../core/tracer'
import { hashPrompt } from '../utils/hash'

export function wrapOllama(
  fetchFn: typeof fetch,
  tracer: ObserveOSTracer
): typeof fetch {
  return async function wrappedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = input.toString()
    const isOllamaChat = url.includes('/api/chat') || url.includes('/api/generate')

    if (!isOllamaChat) return fetchFn(input, init)

    const startMs = Date.now()
    let body: any = {}
    try { body = JSON.parse(init?.body as string ?? '{}') } catch {}

    const rawPrompt = (body.messages ?? [])
      .map((m: any) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n') || body.prompt || ''

    try {
      const response = await fetchFn(input, init)
      const latencyMs = Date.now() - startMs

      const cloned = response.clone()
      let data: any = {}
      try { data = await cloned.json() } catch {}

      const promptTokens     = data.prompt_eval_count as number | undefined
      const completionTokens = data.eval_count as number | undefined
      const totalTokens      = (promptTokens ?? 0) + (completionTokens ?? 0)

      await tracer.record({
        tenantId:        tracer.config.tenantId,
        provider:        'ollama',
        model:           body.model ?? 'unknown',
        promptHash:      hashPrompt(rawPrompt),
        promptPreview:   tracer.config.capturePromptPreview ? rawPrompt.slice(0, 200) : undefined,
        promptTokens,
        completionTokens,
        totalTokens,
        responsePreview: tracer.config.captureResponsePreview
          ? (data.message?.content ?? data.response ?? '').slice(0, 200)
          : undefined,
        finishReason:    data.done ? 'stop' : undefined,
        latencyMs,
        costUsd:         0,
        error:           false,
        tags:            {},
        metadata:        {},
        environment:     tracer.config.environment,
      })

      return response
    } catch (err: any) {
      await tracer.record({
        tenantId:     tracer.config.tenantId,
        provider:     'ollama',
        model:        body.model ?? 'unknown',
        promptHash:   hashPrompt(rawPrompt),
        latencyMs:    Date.now() - startMs,
        error:        true,
        errorMessage: err.message,
        tags:         {},
        metadata:     {},
        environment:  tracer.config.environment,
      })
      throw err
    }
  }
}
