<p align="center">
  <img src="./assets/logo.svg" alt="ObserveOS logo" width="420">
</p>

<h3 align="center">Open Source LLM Observability & Monitoring Platform</h3>

<p align="center">
  ObserveOS is a free, open-source, <strong>self-hosted LLM observability tool</strong> for tracking OpenAI, Anthropic, Ollama, and Hugging Face API calls — token costs, latency, error rates, and prompt tracing, on infrastructure you own.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://www.npmjs.com/package/observeos"><img alt="npm" src="https://img.shields.io/npm/v/observeos.svg"></a>
  <a href="./.github/workflows/ci.yml"><img alt="CI" src="https://github.com/Abdul-Moiz31/ObserveOS/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-339933.svg">
  <a href="./CONTRIBUTING.md"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

<p align="center">
  <sub>Keywords: LLM observability · AI monitoring · OpenAI tracing · Anthropic tracing · LLM cost tracking · OpenTelemetry · self-hosted AI tools · prompt tracing</sub>
</p>

---

## Purpose

Teams shipping LLM-powered features usually have no idea, in production, how much they're spending, how slow responses really are, or how often calls are failing — until a bill or an angry user surfaces it. Commercial observability SaaS tools solve this but require sending your prompts and responses to a third party.

**ObserveOS exists to close that gap without the trade-off.** It gives you the same kind of visibility — costs, latency, errors, full request tracing — for your LLM calls, but as code you run yourself. Drop the SDK into an existing OpenAI/Anthropic/Ollama/Hugging Face integration, point it at your own backend, and you immediately get a dashboard showing exactly what your AI features cost and where they're breaking — with your data never leaving infrastructure you control.

## How to Use It (in 3 Steps)

1. **Stand up the backend** — deploy the included Cloudflare Worker (`packages/worker`) and create a free Cloudflare D1 database. This is your trace storage; you own it.
2. **Wrap your LLM client** — `npm install observeos`, then wrap your existing `OpenAI`, `Anthropic`, `Ollama`, or `HfInference` client with one function call. No other code changes.
3. **Open the dashboard** — run `packages/dashboard` and watch traces, costs, and errors appear as your app makes real LLM calls.

That's the whole workflow. Full copy-pasteable commands are in [Quick Start](#quick-start) and [Self-Hosting the Backend](#self-hosting-the-backend) below.

## Table of Contents

- [Purpose](#purpose)
- [How to Use It (in 3 Steps)](#how-to-use-it-in-3-steps)
- [What is ObserveOS?](#what-is-observeos)
- [Why ObserveOS?](#why-observeos)
- [Architecture](#architecture)
- [Supported Providers](#supported-providers)
- [What Gets Captured](#what-gets-captured)
- [Quick Start](#quick-start)
- [Self-Hosting the Backend](#self-hosting-the-backend)
- [SDK Usage](#sdk-usage)
- [Alerting](#alerting)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What is ObserveOS?

**ObserveOS** is an open-source, self-hostable observability platform for applications built on top of Large Language Models. It wraps your existing provider SDKs (OpenAI, Anthropic, Ollama, Hugging Face) with zero-config tracing, then ships those traces to a lightweight backend you control — no vendor lock-in, no data leaving your infrastructure unless you want it to.

The project is a monorepo composed of three packages that work together:

| Package | Role |
|---|---|
| [`packages/sdk`](./packages/sdk) | The `observeos` npm package — wraps LLM clients and exports traces |
| [`packages/worker`](./packages/worker) | A Cloudflare Worker that ingests, stores, and serves traces (D1/SQLite) |
| [`packages/dashboard`](./packages/dashboard) | A Next.js dashboard for browsing traces, costs, and errors |

## Why ObserveOS?

- **Zero-config** — wrap your existing client, every call is traced automatically. No code changes at call sites.
- **Self-hosted by default** — runs on Cloudflare Workers + D1; your prompts and responses never have to leave infrastructure you own.
- **Provider-agnostic** — one consistent trace schema across OpenAI, Anthropic, Ollama, and Hugging Face.
- **Cost-aware** — token usage and USD cost are computed automatically from a built-in pricing table.
- **OpenTelemetry-compatible** — export traces to your existing OTEL pipeline alongside (or instead of) ObserveOS's own backend.
- **Privacy-conscious** — prompts are hashed (SHA-256) by default; full previews and PII scrubbing are opt-in.
- **Minimal overhead** — designed for sub-millisecond overhead per traced call via batched, async export.

## Architecture

```
┌─────────────────┐      traces       ┌──────────────────┐      query       ┌───────────────────┐
│   Your App       │ ───────────────►  │  ObserveOS Worker │ ◄─────────────── │ ObserveOS Dashboard│
│  + observeos SDK  │   (batched POST)  │  (Cloudflare      │   (REST/JSON)    │  (Next.js)          │
│  wraps OpenAI/    │                   │   Worker + D1)    │                  │                     │
│  Anthropic/Ollama/│                   │                   │                  │                     │
│  Hugging Face     │                   │                   │                  │                     │
└─────────────────┘                    └──────────────────┘                  └───────────────────┘
```

1. The **SDK** wraps your provider client. Every call is intercepted, timed, hashed, costed, and queued.
2. Traces are batched (default: every 5s or 50 traces) and POSTed to the **Worker**'s ingestion API.
3. The **Worker** authenticates the request via API key, persists traces to **D1**, and enforces per-tenant rate limits and retention.
4. The **Dashboard** queries the Worker's REST API to render traces, cost analytics, and error views in real time.

## Supported Providers

| Provider | Wrapper | Status |
|---|---|---|
| OpenAI | `wrapOpenAI()` | ✅ Stable |
| Anthropic | `wrapAnthropic()` | ✅ Stable |
| Ollama | `wrapOllama()` | ✅ Stable |
| Hugging Face | `wrapHuggingFace()` | ✅ Stable |

Provider SDKs are **peer dependencies** and optional — only install the ones you actually use.

## What Gets Captured

Each trace includes:

- **Identity** — `traceId`, `spanId`, `parentSpanId` (for nested/chained calls), `tenantId`
- **Provider** — provider name, model name
- **Prompt** — SHA-256 `promptHash`, optional `promptPreview` (first 200 chars), `promptTokens`
- **Response** — `completionTokens`, `totalTokens`, optional `responsePreview`, `finishReason`
- **Performance** — `latencyMs`, `ttfbMs` (time-to-first-byte for streamed responses)
- **Cost** — `costUsd`, computed from the built-in model pricing table
- **Errors** — `error` flag, `errorMessage`, `statusCode`
- **Context** — `tags`, `metadata`, `environment`, `createdAt`

Prompt/response **previews are off by default** — only hashes are sent unless you explicitly enable previews.

## Quick Start

```bash
npm install observeos openai
```

```typescript
import { createObserveOS } from 'observeos'
import OpenAI from 'openai'

const obs = createObserveOS({
  apiKey: process.env.OBSERVEOS_API_KEY!,
  baseUrl: process.env.OBSERVEOS_BASE_URL!,
  tenantId: process.env.OBSERVEOS_TENANT_ID,
})

const openai = obs.wrapOpenAI(new OpenAI())

// Use the client exactly as you normally would —
// every call is now traced automatically.
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

This assumes you already have an ObserveOS Worker deployed and an API key. See [Self-Hosting the Backend](#self-hosting-the-backend) below to stand one up in a few minutes.

## Self-Hosting the Backend

ObserveOS ships as code, not a hosted SaaS — you run the Worker and Dashboard yourself.

### Quick path

```bash
cp .env.example .env   # fill in CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN
npm ci
npm run setup           # creates the D1 database, deploys the Worker, mints an API key
npm run dev -w packages/dashboard   # http://localhost:3000
```

`npm run setup` runs `scripts/setup.mjs`, which does everything in the manual steps below in one shot: creates (or reuses) the D1 database, patches `packages/worker/wrangler.toml`, applies `schema.sql`, sets a generated `ADMIN_SECRET`, deploys the Worker, mints a `default` tenant API key, and writes `.env` / `packages/dashboard/.dev.vars` for you. It's safe to re-run. Use `npm run setup -- --dry-run` to preview every command first.

<details>
<summary>Manual setup (for custom worker/database names, an existing D1 db, or CI-only deploys)</summary>

#### 1. Create a Cloudflare D1 database

```bash
cd packages/worker
npx wrangler d1 create observeos
```

Copy the resulting `database_id` into `packages/worker/wrangler.toml`.

#### 2. Configure the Worker

Copy `.env.example` to `.env` at the repo root and fill in your Cloudflare credentials (see [Environment Variables](#environment-variables)).

#### 3. Apply the schema and set the admin secret

```bash
cd packages/worker
npx wrangler d1 execute observeos --remote --file=src/db/schema.sql
npx wrangler secret put ADMIN_SECRET
```

#### 4. Deploy the Worker

```bash
npx wrangler deploy
```

#### 5. Mint an API key

The Worker exposes an admin-only `keys` route used to issue tenant API keys:

```bash
curl -X POST https://<your-worker>.workers.dev/v1/keys \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "my-team", "name": "local-dev"}'
```

The response includes a one-time `apiKey` — only its hash is stored, so save it now. Use it as `OBSERVEOS_API_KEY` in your application, and put `WORKER_URL`/`WORKER_API_KEY`/`WORKER_TENANT_ID` in `packages/dashboard/.dev.vars` for the dashboard's Pages Function proxy.

#### 6. Run the Dashboard

```bash
cd packages/dashboard
npm run dev
```

This runs `wrangler pages dev -- next dev`, which serves the Next.js dev server through the same Pages Function proxy (`functions/api/[[path]].ts`) used in production — plain `next dev` alone won't proxy `/api/*` to the Worker. Visit `http://localhost:3000` to browse traces, costs, and errors.

</details>

## SDK Usage

### Wrapping other providers

```typescript
import { createObserveOS } from 'observeos'
import Anthropic from '@anthropic-ai/sdk'

const obs = createObserveOS({ apiKey: '...', baseUrl: '...' })
const anthropic = obs.wrapAnthropic(new Anthropic())
```

```typescript
// Ollama (wraps the fetch function used for requests)
const tracedFetch = obs.wrapOllama(fetch)
```

```typescript
import { HfInference } from '@huggingface/inference'

const hf = obs.wrapHuggingFace(new HfInference(process.env.HF_TOKEN))
```

### Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | ObserveOS API key (required) |
| `baseUrl` | `string` | — | Worker base URL (required) |
| `tenantId` | `string` | — | Logical tenant/project identifier |
| `environment` | `string` | `"development"` | Tag traces by environment |
| `sampleRate` | `number` (0–1) | `1` | Fraction of calls to trace |
| `flushInterval` | `number` (ms) | `5000` | How often batched traces are exported |
| `batchSize` | `number` | `50` | Max traces per export batch |
| `capturePreviews` | `boolean` | `false` | Include prompt/response text previews |
| `scrubPII` | `boolean` | `false` | Best-effort PII scrubbing before export |
| `debug` | `boolean` | `false` | Verbose SDK logging |

### Exported utilities

```typescript
import { hashPrompt, calculateCost, getModelPricing, MODEL_PRICING } from 'observeos'
```

These are useful if you want to compute cost/hash manually outside the wrapper flow (e.g. for a custom/unsupported provider).

## Alerting

The Worker evaluates alert rules on a 5-minute cron and fires a webhook when a metric exceeds a threshold you set — no polling the dashboard required. Manage rules from the dashboard's **Alerts** page, or directly via the API using your tenant `OBSERVEOS_API_KEY`:

```bash
curl -X POST "$OBSERVEOS_BASE_URL/v1/alerts" \
  -H "Authorization: Bearer $OBSERVEOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High daily cost",
    "metric": "cost_usd",
    "windowMinutes": 1440,
    "threshold": 10,
    "webhookUrl": "https://hooks.slack.com/services/...",
    "cooldownMinutes": 60
  }'
```

Supported `metric` values: `cost_usd` (sum over the window), `error_count`, `error_rate` (0–1), `latency_p95` (ms). Once a rule fires it won't fire again for `cooldownMinutes`, even if the condition is still true. The webhook body includes both `text` and `content` fields (compatible with Slack and Discord incoming webhooks out of the box) plus structured `rule`/`value`/`tenantId` fields for custom receivers. `GET /v1/alerts`, `PATCH /v1/alerts/:id`, `DELETE /v1/alerts/:id`, and `GET /v1/alerts/events` (firing history) round out the API.

## Project Structure

```
ObserveOS/
├── packages/
│   ├── sdk/              # observeos npm package
│   │   └── src/
│   │       ├── core/         # tracer + batch exporter
│   │       ├── providers/    # per-provider wrappers
│   │       ├── types/        # shared trace types
│   │       └── utils/        # hashing, cost calculation
│   ├── worker/           # Cloudflare Worker ingestion API
│   │   └── src/
│   │       ├── routes/       # /v1/traces, /v1/metrics, /v1/keys
│   │       ├── middleware/   # auth, rate limiting
│   │       └── db/           # D1 schema & queries
│   └── dashboard/        # Next.js observability UI
│       └── src/
│           ├── app/          # routes/pages (traces, costs, errors)
│           ├── components/
│           ├── hooks/
│           └── lib/
├── .github/workflows/    # CI: type-check, lint, test, build, deploy
├── turbo.json            # Turborepo task graph
└── package.json          # workspace root
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values relevant to what you're running.

```bash
# Cloudflare (required to deploy the Worker/Dashboard)
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_D1_DATABASE_ID=d1_database_id_from_wrangler_d1_create

# Cloudflare Worker
WORKER_ENVIRONMENT=development
WORKER_API_KEY_SECRET=local_dev_secret_change_in_production
WORKER_URL=http://localhost:8787

# ObserveOS SDK (consumed by apps using the `observeos` package)
OBSERVEOS_API_KEY=obs_your_test_key
OBSERVEOS_BASE_URL=http://localhost:8787
OBSERVEOS_TENANT_ID=test_tenant
OBSERVEOS_ENVIRONMENT=development
OBSERVEOS_DEBUG=true

# Next.js Dashboard
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
NEXT_PUBLIC_API_KEY=obs_your_test_key
```

> **Never commit `.env`.** `WORKER_API_KEY_SECRET` is an admin credential used to mint tenant API keys — treat it like a root password.

## Development

This is a [Turborepo](https://turbo.build/repo) monorepo. Requires **Node.js >= 20** and **npm 10.x**.

```bash
# Install dependencies for all workspaces
npm ci

# Run all dev servers in parallel (worker + dashboard + sdk watch)
npm run dev

# Run the full test suite
npm test

# Build all packages
npm run build

# Type-check all packages
npm run type-check

# Lint all packages
npm run lint

# Format the codebase
npm run format

# Remove all build artifacts and node_modules
npm run clean
```

Per-package commands (run from within the package directory, or via Turborepo filters):

```bash
npm run dev --workspace=packages/sdk        # tsup watch build
npm run test --workspace=packages/sdk       # vitest
npm run dev --workspace=packages/worker     # wrangler dev
npm run dev --workspace=packages/dashboard  # next dev
```

## Deployment

| Target | Platform | Trigger |
|---|---|---|
| `packages/sdk` | npm registry (`observeos`) | CI publishes on push to `main` when the version changes |
| `packages/worker` | Cloudflare Workers | CI deploys on push to `main`, with a post-deploy health check |
| `packages/dashboard` | Cloudflare Pages | CI deploys on push to `main` |

CI is defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) (type-check → lint → test → build → publish/deploy) and [`.github/workflows/pr.yml`](./.github/workflows/pr.yml) (type-check → lint → test → build on every pull request).

To deploy manually:

```bash
npm run deploy   # turbo run deploy across all packages
```

Worker and Dashboard deploys require `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to be set; SDK publishing requires `NPM_TOKEN` in CI secrets.

## Tech Stack

- **Language:** TypeScript (strict mode) across all packages
- **SDK build:** [tsup](https://tsup.egoist.dev/) (dual CJS/ESM + type declarations), tested with [Vitest](https://vitest.dev/)
- **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/) + [D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- **Frontend:** [Next.js](https://nextjs.org/) + [Recharts](https://recharts.org/)
- **Monorepo tooling:** [Turborepo](https://turbo.build/repo), npm workspaces
- **CI/CD:** GitHub Actions

## Roadmap

- [ ] Additional provider wrappers (Google Gemini, Mistral, AWS Bedrock)
- [ ] Native OpenTelemetry collector export mode
- [x] Alerting on error rate / cost thresholds
- [ ] Self-hosted Postgres backend option (alternative to D1)
- [ ] Dashboard: saved views and team-level cost budgets

Have an idea? [Open an issue](https://github.com/Abdul-Moiz31/ObserveOS/issues) or start a discussion.

## Contributing

Contributions are welcome — bug reports, feature requests, documentation fixes, and pull requests of all sizes.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and the PR process before opening a pull request.

## License

[MIT](./LICENSE) © Abdul Mueez
