# observeos

**Zero-config LLM observability SDK.** Automatically trace your OpenAI, Anthropic, Ollama, and Hugging Face API calls. Calculate costs, measure latency, detect errors.

## Features

- Zero-config drop-in wrappers for OpenAI, Anthropic, Ollama, Hugging Face
- Automatic token cost calculation
- Batch trace export (non-blocking)
- Optional OpenTelemetry export
- PII scrubbing (optional)
- TypeScript-first (strict mode)
- Minimal overhead (< 1ms per call)

## Installation

```bash
npm install observeos
```

## Quick Start

```typescript
import OpenAI from 'openai'
import { createObserveOS } from 'observeos'

// Initialize once at app startup
const obs = createObserveOS({
  apiKey: process.env.OBSERVEOS_API_KEY!,
  baseUrl: process.env.OBSERVEOS_BASE_URL!,
  tenantId: 'my_org',
})

// Wrap your clients — drop-in replacements
const openai = obs.wrapOpenAI(new OpenAI())

// Use exactly as before — tracing is automatic
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

Every call is now traced and sent to your observability backend automatically.

## Configuration

```typescript
createObserveOS({
  apiKey: string,                  // required: your API key
  baseUrl: string,                 // optional: worker URL (default: http://localhost:8787)
  tenantId: string,                // optional: tenant identifier (default: 'default')
  environment: 'production',       // optional: environment name
  enabled: true,                   // optional: disable tracing without code changes
  sampleRate: 1,                   // optional: trace 100% of calls (0-1)
  capturePromptPreview: true,      // optional: capture first 200 chars of prompt
  captureResponsePreview: true,    // optional: capture first 200 chars of response
  piiScrubbing: false,             // optional: mask PII before sending
  flushInterval: 5000,             // optional: ms between batch flushes
  maxBatchSize: 50,                // optional: traces per batch
  otelEndpoint: undefined,         // optional: OTEL collector endpoint
  debug: false,                    // optional: log SDK activity
})
```

## Supported Providers

### OpenAI

```typescript
import OpenAI from 'openai'
const openai = obs.wrapOpenAI(new OpenAI())
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk'
const anthropic = obs.wrapAnthropic(new Anthropic())
```

### Ollama

```typescript
const fetchWithTracing = obs.wrapOllama(fetch)
const response = await fetchWithTracing('http://localhost:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({ model: 'llama3', messages: [] }),
})
```

### Hugging Face

```typescript
import { HfInference } from '@huggingface/inference'
const hf = obs.wrapHuggingFace(new HfInference())
```

## Graceful Shutdown

Flush pending traces before exiting:

```typescript
process.on('SIGTERM', async () => {
  await obs.tracer.shutdown()
  process.exit(0)
})
```

## Pricing

Cost is calculated automatically using current provider pricing. See `MODEL_PRICING` for details.

## License

MIT
