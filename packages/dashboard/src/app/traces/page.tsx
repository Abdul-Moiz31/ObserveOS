'use client'

import { useEffect, useState, useCallback } from 'react'
import Layout from '@/components/Layout'
import TraceRow from '@/components/TraceRow'
import { api } from '@/lib/api'

const PROVIDERS = ['', 'openai', 'anthropic', 'ollama', 'huggingface']

export default function TracesPage() {
  const [traces, setTraces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [errorOnly, setErrorOnly] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 50

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
      ...(provider ? { provider } : {}),
      ...(errorOnly ? { error: 'true' } : {}),
    })
    api.getTraces(params.toString())
      .then(setTraces)
      .catch((err) => {
        console.error('Failed to load traces:', err)
        setTraces([])
      })
      .finally(() => setLoading(false))
  }, [provider, errorOnly, page])

  useEffect(() => { load() }, [load])

  return (
    <Layout>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Traces</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setPage(0) }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p || 'All providers'}</option>
            ))}
          </select>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={errorOnly}
              onChange={(e) => { setErrorOnly(e.target.checked); setPage(0) }}
            />
            Errors only
          </label>

          <button
            onClick={load}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'border var(--transition-fast)',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 80px 80px 80px 80px',
          gap: 16,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span>Provider</span>
          <span>Model / Prompt</span>
          <span>Latency</span>
          <span>Tokens</span>
          <span>Cost</span>
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Loading traces...
          </div>
        ) : traces.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No traces found.
          </div>
        ) : (
          traces.map((trace) => <TraceRow key={trace.id} trace={trace} />)
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            cursor: page === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={traces.length < limit}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: traces.length < limit ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            cursor: traces.length < limit ? 'not-allowed' : 'pointer',
          }}
        >
          Next
        </button>
      </div>
    </Layout>
  )
}
