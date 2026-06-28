interface ModelPricing {
  input: number   // USD per 1M input tokens
  output: number  // USD per 1M output tokens
}

// Prices per 1M tokens in USD
// Update this map when providers change pricing
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o':                     { input: 2.50,   output: 10.00  },
  'gpt-4o-mini':                { input: 0.15,   output: 0.60   },
  'gpt-4o-2024-11-20':         { input: 2.50,   output: 10.00  },
  'gpt-4-turbo':                { input: 10.00,  output: 30.00  },
  'gpt-4-turbo-preview':        { input: 10.00,  output: 30.00  },
  'gpt-3.5-turbo':              { input: 0.50,   output: 1.50   },
  'gpt-3.5-turbo-0125':         { input: 0.50,   output: 1.50   },
  'o1':                         { input: 15.00,  output: 60.00  },
  'o1-mini':                    { input: 3.00,   output: 12.00  },
  'o3-mini':                    { input: 1.10,   output: 4.40   },

  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 3.00,   output: 15.00  },
  'claude-3-5-haiku-20241022':  { input: 0.80,   output: 4.00   },
  'claude-3-opus-20240229':     { input: 15.00,  output: 75.00  },
  'claude-3-sonnet-20240229':   { input: 3.00,   output: 15.00  },
  'claude-3-haiku-20240307':    { input: 0.25,   output: 1.25   },

  // Ollama (self-hosted — always $0)
  'llama3': { input: 0, output: 0 },
  'llama3.1': { input: 0, output: 0 },
  'llama3.2': { input: 0, output: 0 },
  'mistral': { input: 0, output: 0 },
  'mixtral': { input: 0, output: 0 },
  'phi3': { input: 0, output: 0 },
  'gemma2': { input: 0, output: 0 },
  'qwen2': { input: 0, output: 0 },
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  const inputCost  = (inputTokens  / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  // Store as fixed 8 decimal places to avoid floating point drift
  return parseFloat((inputCost + outputCost).toFixed(8))
}

export function getModelPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING[model]
}
