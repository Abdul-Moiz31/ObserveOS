const MAX_STRING = 500
const MAX_PREVIEW = 4000
const MAX_JSON = 10_000
const ALLOWED_PROVIDERS = new Set(['openai', 'anthropic', 'ollama', 'huggingface'])
const TRACE_ID_RE = /^[a-f0-9]{1,32}$/i
const SPAN_ID_RE = /^[a-f0-9]{1,16}$/i

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

function isNonEmptyString(v: unknown, max = MAX_STRING): boolean {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}

export function validateTrace(trace: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof trace !== 'object' || trace === null || Array.isArray(trace)) {
    return { valid: false, errors: ['trace must be an object'] }
  }

  const t = trace as Record<string, unknown>

  if (!isNonEmptyString(t.provider) || !ALLOWED_PROVIDERS.has((t.provider as string).toLowerCase())) {
    errors.push(`provider must be one of: ${[...ALLOWED_PROVIDERS].join(', ')}`)
  }
  if (!isNonEmptyString(t.model)) {
    errors.push('model is required (string, max 500 chars)')
  }
  if (!isNonEmptyString(t.promptHash, 128)) {
    errors.push('promptHash is required (string, max 128 chars)')
  }
  if (typeof t.latencyMs !== 'number' || !Number.isFinite(t.latencyMs) || t.latencyMs < 0) {
    errors.push('latencyMs must be a non-negative number')
  }

  if (t.traceId !== undefined && (typeof t.traceId !== 'string' || !TRACE_ID_RE.test(t.traceId))) {
    errors.push('traceId must be a hex string up to 32 chars')
  }
  if (t.spanId !== undefined && (typeof t.spanId !== 'string' || !SPAN_ID_RE.test(t.spanId))) {
    errors.push('spanId must be a hex string up to 16 chars')
  }
  if (
    t.parentSpanId !== undefined &&
    t.parentSpanId !== null &&
    (typeof t.parentSpanId !== 'string' || !SPAN_ID_RE.test(t.parentSpanId))
  ) {
    errors.push('parentSpanId must be a hex string up to 16 chars')
  }

  for (const field of ['promptPreview', 'responsePreview'] as const) {
    const v = t[field]
    if (v !== undefined && v !== null && (typeof v !== 'string' || v.length > MAX_PREVIEW)) {
      errors.push(`${field} must be a string up to ${MAX_PREVIEW} chars`)
    }
  }

  for (const field of ['promptTokens', 'completionTokens', 'totalTokens', 'ttfbMs', 'statusCode'] as const) {
    const v = t[field]
    if (v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
      errors.push(`${field} must be a non-negative number`)
    }
  }

  if (t.costUsd !== undefined && t.costUsd !== null && (typeof t.costUsd !== 'number' || !Number.isFinite(t.costUsd) || t.costUsd < 0)) {
    errors.push('costUsd must be a non-negative number')
  }

  if (t.error !== undefined && typeof t.error !== 'boolean') {
    errors.push('error must be a boolean')
  }
  if (t.errorMessage !== undefined && t.errorMessage !== null && !isNonEmptyString(t.errorMessage, MAX_PREVIEW)) {
    errors.push(`errorMessage must be a string up to ${MAX_PREVIEW} chars`)
  }

  for (const field of ['tags', 'metadata'] as const) {
    const v = t[field]
    if (v !== undefined && v !== null) {
      if (typeof v !== 'object' || Array.isArray(v)) {
        errors.push(`${field} must be an object`)
      } else if (JSON.stringify(v).length > MAX_JSON) {
        errors.push(`${field} is too large (max ${MAX_JSON} bytes serialized)`)
      }
    }
  }

  if (t.environment !== undefined && !isNonEmptyString(t.environment, 100)) {
    errors.push('environment must be a string up to 100 chars')
  }

  return { valid: errors.length === 0, errors }
}
