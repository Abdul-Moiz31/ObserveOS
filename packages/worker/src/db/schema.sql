-- Run with: wrangler d1 execute observeos --file=src/db/schema.sql

CREATE TABLE IF NOT EXISTS llm_traces (
  id                TEXT PRIMARY KEY,
  trace_id          TEXT NOT NULL,
  span_id           TEXT NOT NULL,
  parent_span_id    TEXT,
  tenant_id         TEXT NOT NULL,

  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,

  prompt_hash       TEXT NOT NULL,
  prompt_preview    TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,

  response_preview  TEXT,
  finish_reason     TEXT,

  latency_ms        INTEGER NOT NULL,
  ttfb_ms           INTEGER,
  cost_usd          REAL,

  error             INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  status_code       INTEGER,

  tags              TEXT DEFAULT '{}',
  metadata          TEXT DEFAULT '{}',
  environment       TEXT DEFAULT 'production',

  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traces_tenant_id      ON llm_traces (tenant_id);
CREATE INDEX IF NOT EXISTS idx_traces_created_at     ON llm_traces (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_tenant_created ON llm_traces (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_provider       ON llm_traces (provider);
CREATE INDEX IF NOT EXISTS idx_traces_model          ON llm_traces (model);
CREATE INDEX IF NOT EXISTS idx_traces_error          ON llm_traces (error) WHERE error = 1;
CREATE INDEX IF NOT EXISTS idx_traces_prompt_hash    ON llm_traces (prompt_hash);

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,        -- first 8 chars for display
  key_hash     TEXT NOT NULL UNIQUE, -- SHA-256 of full key
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash     TEXT NOT NULL,
  window_start INTEGER NOT NULL, -- floor(unix_ms / 60000), i.e. 1-minute buckets
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, window_start)
);
