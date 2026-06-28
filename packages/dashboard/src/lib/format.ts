export const PROVIDER_COLORS: Record<string, string> = {
  openai:      '#10a37f',
  anthropic:   '#c96442',
  ollama:      '#8b5cf6',
  huggingface: '#f6be00',
}

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? 'var(--text-secondary)'
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null || cost === 0) return '—'
  if (cost < 0.001) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(4)}`
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return '—'
  return `${Math.round(ms)}ms`
}

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens == null) return '—'
  return tokens.toLocaleString()
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}
