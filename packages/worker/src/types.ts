export interface Env {
  DB: D1Database
  // Admin secret used only to mint/revoke per-tenant API keys via /v1/keys.
  // Day-to-day ingestion/query auth uses hashed keys stored in the api_keys table.
  ADMIN_SECRET: string
  ENVIRONMENT: string
  RETENTION_DAYS?: string
}

export interface ApiKeyRow {
  id: string
  tenant_id: string
  key_prefix: string
  key_hash: string
  name: string
  created_at: string
  last_used_at: string | null
  revoked: number
}

export interface AuthContext {
  tenantId: string
  keyId: string
  keyHash: string
}

export interface TraceRow {
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
