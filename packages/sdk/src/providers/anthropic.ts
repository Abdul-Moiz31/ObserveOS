import type Anthropic from '@anthropic-ai/sdk'
import { ObserveOSTracer } from '../core/tracer'
import { hashPrompt } from '../utils/hash'
import { calculateCost } from '../utils/cost'
import { scrubPII } from '../utils/sanitize'

export function wrapAnthropic<T extends Anthropic>(client: T, tracer: ObserveOSTracer): T {
  const original = client.messages.create.bind(client.messages)

  ;(client.messages as any).create = async function (
    params: Parameters<Anthropic['messages']['create']>[0],
    options?: Parameters<Anthropic['messages']['create']>[1]
  ) {
    if ((params as any).stream) return original(params as any, options)

    const startMs = Date.now()
    const rawPrompt = (params.messages ?? [])
      .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n')

    const prompt = tracer.config.piiScrubbing ? scrubPII(rawPrompt) : rawPrompt

    try {
      const response = await original(params as any, options)
      const latencyMs = Date.now() - startMs
      const res = response as any
      const usage = res.usage

      const promptTokens     = usage?.input_tokens
      const completionTokens = usage?.output_tokens
      const totalTokens      = (promptTokens ?? 0) + (completionTokens ?? 0)
      const costUsd = (promptTokens != null && completionTokens != null)
        ? calculateCost(params.model, promptTokens, completionTokens)
        : undefined

      const rawResponse = res.content
        ?.filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('') ?? ''
      const responseText = tracer.config.piiScrubbing ? scrubPII(rawResponse) : rawResponse

      await tracer.record({
        tenantId:        tracer.config.tenantId,
        provider:        'anthropic',
        model:           params.model,
        promptHash:      hashPrompt(rawPrompt),
        promptPreview:   tracer.config.capturePromptPreview ? prompt.slice(0, 200) : undefined,
        promptTokens,
        completionTokens,
        totalTokens,
        responsePreview: tracer.config.captureResponsePreview ? responseText.slice(0, 200) : undefined,
        finishReason:    res.stop_reason,
        latencyMs,
        costUsd,
        error:           false,
        tags:            {},
        metadata:        {},
        environment:     tracer.config.environment,
      })

      return response
    } catch (err: any) {
      await tracer.record({
        tenantId:     tracer.config.tenantId,
        provider:     'anthropic',
        model:        params.model,
        promptHash:   hashPrompt(rawPrompt),
        latencyMs:    Date.now() - startMs,
        error:        true,
        errorMessage: err.message,
        statusCode:   err.status,
        tags:         {},
        metadata:     {},
        environment:  tracer.config.environment,
      })
      throw err
    }
  }

  return client
}
