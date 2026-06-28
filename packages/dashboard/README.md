# @observeos/dashboard

Next.js observability dashboard, statically exported and deployed to
Cloudflare Pages.

## Architecture

The dashboard never talks to the Worker directly with a bundled secret.
Instead, all data fetches go through a same-origin Cloudflare Pages Function
proxy at `functions/api/[[path]].ts`, which attaches the Worker API key
server-side. This keeps the key out of the static client bundle.

```
browser → /api/traces → Pages Function (attaches Authorization header) → Worker /v1/traces
```

## Configuration

Public, safe to expose to the browser:

- `NEXT_PUBLIC_WORKER_URL` — used at build time only for display purposes.

Server-side only — configure as Cloudflare Pages **environment
variables/secrets** (Pages project settings, or `wrangler pages secret put`),
never as `NEXT_PUBLIC_*`:

- `WORKER_URL` — the Worker's URL, e.g. `https://observeos-worker.<subdomain>.workers.dev`
- `WORKER_API_KEY` — a per-tenant key minted via `POST /v1/keys` on the Worker (see `packages/worker/README.md`)
- `WORKER_TENANT_ID` — optional, defaults to `default`

CI sets these automatically on every deploy (see `.github/workflows/ci.yml`).

## Development

```bash
npm run dev          # next dev, http://localhost:3000
```

The Pages Function proxy only runs under Wrangler, not `next dev`. To
exercise it locally:

```bash
npm run build
npx wrangler pages dev out --binding WORKER_URL=http://localhost:8787 \
  --binding WORKER_API_KEY=<a key minted from the local worker>
```

## Deployment

```bash
npm run build                                            # next build (static export to out/)
npx wrangler pages deploy out --project-name observeos-dashboard
```
