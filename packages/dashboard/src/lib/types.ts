export interface Trace {
  id: string
  trace_id: string
  span_id: string
  parent_span_id: string | null
  tenant_id: string
  provider: string
  model: string
  prompt_hash: string
  prompt_preview: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  response_preview: string | null
  finish_reason: string | null
  latency_ms: number
  ttfb_ms: number | null
  cost_usd: number | null
  error: number
  error_message: string | null
  status_code: number | null
  tags: string
  metadata: string
  environment: string
  created_at: string
}

export interface ModelBreakdown {
  model: string
  provider: string
  calls: number
  cost_usd: number | null
  avg_latency_ms: number | null
}

export interface ProviderBreakdown {
  provider: string
  calls: number
  cost_usd: number | null
}

export interface ErrorRateDay {
  day: string
  total: number
  errors: number
}

export interface MetricsSummary {
  total_calls: number
  total_tokens: number | null
  total_cost_usd: number | null
  avg_latency_ms: number | null
  total_errors: number
}

export interface LatencyPercentiles {
  p50: number | null
  p95: number | null
  p99: number | null
}

export interface Metrics {
  summary: MetricsSummary
  byModel: ModelBreakdown[]
  byProvider: ProviderBreakdown[]
  errorRateByDay: ErrorRateDay[]
  latencyPercentiles: LatencyPercentiles
  period: { days: number; from: string }
}

export type AlertMetric = 'cost_usd' | 'error_count' | 'error_rate' | 'latency_p95'

export interface AlertRule {
  id: string
  tenant_id: string
  name: string
  metric: AlertMetric
  window_minutes: number
  threshold: number
  webhook_url: string
  cooldown_minutes: number
  enabled: number
  created_at: string
  updated_at: string
}

export interface AlertEvent {
  id: string
  rule_id: string
  tenant_id: string
  metric_value: number
  threshold: number
  webhook_status: number | null
  triggered_at: string
}
