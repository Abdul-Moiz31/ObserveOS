import { ObserveOSTracer } from '../core/tracer'
import { hashPrompt } from '../utils/hash'

export function wrapHuggingFace<T extends object>(client: T, tracer: ObserveOSTracer): T {
  const methods = ['textGeneration', 'chatCompletion', 'textClassification', 'summarization'] as const

  for (const method of methods) {
    const original = (client as any)[method]?.bind(client)
    if (!original) continue

    ;(client as any)[method] = async function (params: any) {
      const startMs = Date.now()
      const rawPrompt = params.inputs ?? params.messages?.map((m: any) => m.content).join('\n') ?? ''

      try {
        const response = await original(params)
        const latencyMs = Date.now() - startMs

        const responseText =
          response?.generated_text ??
          response?.choices?.[0]?.message?.content ??
          (Array.isArray(response) ? response[0]?.generated_text : '') ??
          ''

        await tracer.record({
          tenantId:        tracer.config.tenantId,
          provider:        'huggingface',
          model:           params.model ?? 'unknown',
          promptHash:      hashPrompt(rawPrompt),
          promptPreview:   tracer.config.capturePromptPreview ? rawPrompt.slice(0, 200) : undefined,
          responsePreview: tracer.config.captureResponsePreview ? String(responseText).slice(0, 200) : undefined,
          latencyMs,
          error:           false,
          tags:            { hf_method: method },
          metadata:        {},
          environment:     tracer.config.environment,
        })

        return response
      } catch (err: any) {
        await tracer.record({
          tenantId:     tracer.config.tenantId,
          provider:     'huggingface',
          model:        params.model ?? 'unknown',
          promptHash:   hashPrompt(rawPrompt),
          latencyMs:    Date.now() - startMs,
          error:        true,
          errorMessage: err.message,
          tags:         { hf_method: method },
          metadata:     {},
          environment:  tracer.config.environment,
        })
        throw err
      }
    }
  }

  return client
}
