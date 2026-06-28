# ObserveOS

**TypeScript-native LLM observability SDK. Self-hostable. OTEL-compatible.**

Monitor your LLM API calls: token costs, latency, errors, prompt hashing.

Works with: OpenAI, Anthropic, Ollama, Hugging Face.

## Quick Start

```typescript
import { createObserveOS } from 'observeos'
import OpenAI from 'openai'

const obs = createObserveOS({
  apiKey: process.env.OBSERVEOS_API_KEY!,
  baseUrl: process.env.OBSERVEOS_BASE_URL!,
})

const openai = obs.wrapOpenAI(new OpenAI())
// Every call is now traced automatically
```

## Packages

- `packages/sdk` — Consumer-facing npm package
- `packages/worker` — Cloudflare Worker ingestion API
- `packages/dashboard` — Next.js observability dashboard

## Development

```bash
# Install dependencies
npm ci

# Run dev servers (all packages)
npm run dev

# Run tests
npm test

# Build everything
npm run build

# Type check
npm run type-check

# Format code
npm run format
```

## Deployment

See `packages/worker/README.md` for Worker deployment
See `packages/dashboard/README.md` for Dashboard deployment
See `packages/sdk/README.md` for npm publishing

## License

MIT — See LICENSE file
