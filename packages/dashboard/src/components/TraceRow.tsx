interface Trace {
  id: string
  provider: string
  model: string
  latency_ms: number
  cost_usd: number | null
  total_tokens: number | null
  error: number
  created_at: string
  prompt_preview: string | null
  finish_reason: string | null
}

const PROVIDER_COLORS: Record<string, string> = {
  openai:      '#10a37f',
  anthropic:   '#c96442',
  ollama:      '#8b5cf6',
  huggingface: '#f6be00',
}

function formatCost(cost: number | null): string {
  if (cost == null || cost === 0) return '—'
  if (cost < 0.001) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(4)}`
}

export default function TraceRow({ trace }: { trace: Trace }) {
  const isError = trace.error === 1
  const color = PROVIDER_COLORS[trace.provider] ?? 'var(--text-secondary)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '100px 1fr 80px 80px 80px 80px',
      gap: 16,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      fontSize: 13,
      alignItems: 'center',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        color,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
        }} />
        {trace.provider}
      </span>

      <div style={{ minWidth: 0 }}>
        <p style={{
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: 2,
        }}>
          {trace.model}
        </p>
        {trace.prompt_preview && (
          <p style={{
            color: 'var(--text-tertiary)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {trace.prompt_preview}
          </p>
        )}
      </div>

      <span style={{
        color: trace.latency_ms > 3000 ? 'var(--warning)' : 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {trace.latency_ms}ms
      </span>

      <span style={{
        color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {trace.total_tokens?.toLocaleString() ?? '—'}
      </span>

      <span style={{
        color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>
        {formatCost(trace.cost_usd)}
      </span>

      <span style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
        background: isError ? 'var(--danger-dim)' : 'var(--accent-dim)',
        color: isError ? 'var(--danger)' : 'var(--accent)',
        fontWeight: 500,
        justifySelf: 'flex-end',
      }}>
        {isError ? 'Error' : (trace.finish_reason ?? 'ok')}
      </span>
    </div>
  )
}
