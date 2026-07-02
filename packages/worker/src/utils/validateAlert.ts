import type { ValidationResult } from './validate'

const ALLOWED_METRICS = new Set(['cost_usd', 'error_count', 'error_rate', 'latency_p95'])
const MIN_WINDOW_MINUTES = 5
const MAX_WINDOW_MINUTES = 1440
const MIN_COOLDOWN_MINUTES = 5
const MAX_COOLDOWN_MINUTES = 1440
const MAX_NAME_LENGTH = 200
const MAX_WEBHOOK_URL_LENGTH = 2000

function isNonEmptyString(v: unknown, max: number): boolean {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}

function isIntInRange(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
}

function isValidWebhookUrl(v: unknown): boolean {
  if (!isNonEmptyString(v, MAX_WEBHOOK_URL_LENGTH)) return false
  try {
    const url = new URL(v as string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Validates the full set of fields for creating a rule (POST /v1/alerts).
export function validateAlertRule(input: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: ['alert rule must be an object'] }
  }

  const r = input as Record<string, unknown>

  if (!isNonEmptyString(r.name, MAX_NAME_LENGTH)) {
    errors.push(`name is required (string, max ${MAX_NAME_LENGTH} chars)`)
  }
  if (!isNonEmptyString(r.metric, 50) || !ALLOWED_METRICS.has(r.metric as string)) {
    errors.push(`metric must be one of: ${[...ALLOWED_METRICS].join(', ')}`)
  }
  if (!isIntInRange(r.windowMinutes, MIN_WINDOW_MINUTES, MAX_WINDOW_MINUTES)) {
    errors.push(`windowMinutes must be an integer between ${MIN_WINDOW_MINUTES} and ${MAX_WINDOW_MINUTES}`)
  }
  if (typeof r.threshold !== 'number' || !Number.isFinite(r.threshold) || r.threshold <= 0) {
    errors.push('threshold must be a positive number')
  }
  if (!isValidWebhookUrl(r.webhookUrl)) {
    errors.push('webhookUrl must be a valid http(s) URL')
  }
  if (
    r.cooldownMinutes !== undefined &&
    !isIntInRange(r.cooldownMinutes, MIN_COOLDOWN_MINUTES, MAX_COOLDOWN_MINUTES)
  ) {
    errors.push(`cooldownMinutes must be an integer between ${MIN_COOLDOWN_MINUTES} and ${MAX_COOLDOWN_MINUTES}`)
  }

  return { valid: errors.length === 0, errors }
}

// Validates a partial update (PATCH /v1/alerts/:id) — every field is optional,
// but whichever are present must still be well-formed.
export function validateAlertRuleUpdate(input: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: ['update body must be an object'] }
  }

  const r = input as Record<string, unknown>

  if (r.name !== undefined && !isNonEmptyString(r.name, MAX_NAME_LENGTH)) {
    errors.push(`name must be a string up to ${MAX_NAME_LENGTH} chars`)
  }
  if (r.metric !== undefined && (!isNonEmptyString(r.metric, 50) || !ALLOWED_METRICS.has(r.metric as string))) {
    errors.push(`metric must be one of: ${[...ALLOWED_METRICS].join(', ')}`)
  }
  if (r.windowMinutes !== undefined && !isIntInRange(r.windowMinutes, MIN_WINDOW_MINUTES, MAX_WINDOW_MINUTES)) {
    errors.push(`windowMinutes must be an integer between ${MIN_WINDOW_MINUTES} and ${MAX_WINDOW_MINUTES}`)
  }
  if (
    r.threshold !== undefined &&
    (typeof r.threshold !== 'number' || !Number.isFinite(r.threshold) || r.threshold <= 0)
  ) {
    errors.push('threshold must be a positive number')
  }
  if (r.webhookUrl !== undefined && !isValidWebhookUrl(r.webhookUrl)) {
    errors.push('webhookUrl must be a valid http(s) URL')
  }
  if (
    r.cooldownMinutes !== undefined &&
    !isIntInRange(r.cooldownMinutes, MIN_COOLDOWN_MINUTES, MAX_COOLDOWN_MINUTES)
  ) {
    errors.push(`cooldownMinutes must be an integer between ${MIN_COOLDOWN_MINUTES} and ${MAX_COOLDOWN_MINUTES}`)
  }
  if (r.enabled !== undefined && typeof r.enabled !== 'boolean') {
    errors.push('enabled must be a boolean')
  }

  return { valid: errors.length === 0, errors }
}
