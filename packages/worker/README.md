# @observeos/worker

Cloudflare Worker ingestion API for ObserveOS, backed by D1.

## Auth model

- **Per-tenant API keys** authenticate `/v1/traces` and `/v1/metrics`. Keys are
  generated server-side, stored as a SHA-256 hash in the `api_keys` table, and
  never persisted or logged in plaintext.
- **`ADMIN_SECRET`** is a separate, higher-privilege secret used only to mint
  and revoke API keys via `/v1/keys`. It should not be distributed to SDK
  consumers or the dashboard.

## Setup

```bash
# Create the D1 database (first time only)
wrangler d1 create observeos
# copy the returned database_id into wrangler.toml

# Apply schema
wrangler d1 execute observeos --file=src/db/schema.sql

# Set the admin secret (used only for /v1/keys)
wrangler secret put ADMIN_SECRET
```

## Minting an API key

```bash
curl -X POST https://<worker-url>/v1/keys \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "acme", "name": "production ingestion"}'
```

The response contains the raw `apiKey` exactly once — store it in your SDK
config (`OBSERVEOS_API_KEY`) or dashboard config (`WORKER_API_KEY`). Only its
hash is kept server-side.

Revoke a key:

```bash
curl -X DELETE https://<worker-url>/v1/keys/<id> \
  -H "Authorization: Bearer <ADMIN_SECRET>"
```

## Rate limiting & retention

- Ingestion (`POST /v1/traces`) is limited to 120 requests/min per key; reads
  (`GET /v1/traces`, `/v1/metrics`) to 300/min. Limits are enforced with a
  fixed-window counter in D1 (table `rate_limits`).
- A daily cron trigger (`scheduled()` in `src/index.ts`, configured in
  `wrangler.toml`) deletes traces older than `RETENTION_DAYS` (default 90)
  and stale rate-limit rows.

## Deployment

```bash
npm run build      # wrangler deploy --dry-run, validates bindings
npm run deploy      # wrangler deploy
```

CI deploys automatically on push to `main` (see `.github/workflows/ci.yml`),
setting `ADMIN_SECRET` via `wrangler secret put` before each deploy.

## Development

```bash
npm run dev          # wrangler dev, http://localhost:8787
npm test             # vitest — pure-logic unit tests (hashing, validation, rate-limit windowing)
npm run type-check
npm run lint
```
