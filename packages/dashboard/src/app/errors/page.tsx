'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import TraceRow from '@/components/TraceRow'
import Pagination from '@/components/Pagination'
import { useTraces } from '@/hooks/useTraces'

export default function ErrorsPage() {
  const [page, setPage] = useState(0)
  const limit = 50
  const { data: traces, loading, refetch } = useTraces({ errorOnly: true, page, limit })

  return (
    <Layout>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Errors</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Failed LLM calls across all providers
          </p>
        </div>
        <button
          onClick={refetch}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
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
            Loading errors...
          </div>
        ) : !traces || traces.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No errors found.
          </div>
        ) : (
          traces.map((trace) => <TraceRow key={trace.id} trace={trace} />)
        )}
      </div>

      <Pagination
        page={page}
        hasNext={(traces?.length ?? 0) >= limit}
        onPrevious={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </Layout>
  )
}
