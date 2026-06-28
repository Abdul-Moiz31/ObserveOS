import type OpenAI from 'openai'
import { ObserveOSTracer } from '../core/tracer'
import { hashPrompt } from '../utils/hash'
import { calculateCost } from '../utils/cost'
import { scrubPII } from '../utils/sanitize'

export function wrapOpenAI<T extends OpenAI>(client: T, tracer: ObserveOSTracer): T {
  const original = client.chat.completions.create.bind(client.chat.completions)

  ;(client.chat.completions as any).create = async function (
    params: Parameters<OpenAI['chat']['completions']['create']>[0],
    options?: Parameters<OpenAI['chat']['completions']['create']>[1]
  ) {
    // Pass through streaming calls without wrapping (Phase 2 feature)
    if ((params as any).stream) {
      return original(params as any, options)
    }

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

      const promptTokens     = usage?.prompt_tokens
      const completionTokens = usage?.completion_tokens
      const totalTokens      = usage?.total_tokens
      const costUsd = (promptTokens != null && completionTokens != null)
        ? calculateCost(params.model as string, promptTokens, completionTokens)
        : undefined

      let responseText = res.choices?.[0]?.message?.content ?? ''
      if (tracer.config.piiScrubbing) responseText = scrubPII(responseText)

      await tracer.record({
        tenantId:          tracer.config.tenantId,
        provider:          'openai',
        model:             params.model as string,
        promptHash:        hashPrompt(rawPrompt),
        promptPreview:     tracer.config.capturePromptPreview ? prompt.slice(0, 200) : undefined,
        promptTokens,
        completionTokens,
        totalTokens,
        responsePreview:   tracer.config.captureResponsePreview ? responseText.slice(0, 200) : undefined,
        finishReason:      res.choices?.[0]?.finish_reason,
        latencyMs,
        costUsd,
        error:             false,
        tags:              {},
        metadata:          {},
        environment:       tracer.config.environment,
      })

      return response
    } catch (err: any) {
      await tracer.record({
        tenantId:     tracer.config.tenantId,
        provider:     'openai',
        model:        params.model as string,
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
