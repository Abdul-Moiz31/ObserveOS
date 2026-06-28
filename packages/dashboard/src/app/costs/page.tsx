'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import Chart from '@/components/Chart'
import { useMetrics } from '@/hooks/useMetrics'
import { formatCost, providerColor } from '@/lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function CostsPage() {
  const [days, setDays] = useState(7)
  const { data: metrics, loading } = useMetrics(days)
  const summary = metrics?.summary

  return (
    <Layout>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Costs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Spend breakdown by model and provider
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading costs...</div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Total Cost"
              value={formatCost(summary?.total_cost_usd ?? 0)}
              color="var(--accent)"
            />
            <StatCard
              label="Total Calls"
              value={(summary?.total_calls ?? 0).toLocaleString()}
            />
            <StatCard
              label="Total Tokens"
              value={(summary?.total_tokens ?? 0).toLocaleString()}
            />
          </div>

          {metrics?.byModel && metrics.byModel.length > 0 && (
            <Chart title="Cost by Model" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byModel} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="model"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${Number(v).toFixed(6)}`, 'Cost']}
                  />
                  <Bar dataKey="cost_usd" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Chart>
          )}

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 100px',
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
              <span>Calls</span>
              <span>Cost</span>
              <span style={{ textAlign: 'right' }}>Share</span>
            </div>

            {!metrics?.byProvider || metrics.byProvider.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No cost data yet.
              </div>
            ) : (
              metrics.byProvider.map((p) => {
                const total = summary?.total_cost_usd || 1
                const share = ((p.cost_usd ?? 0) / total) * 100
                return (
                  <div key={p.provider} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px 100px',
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
                      color: providerColor(p.provider),
                      fontWeight: 500,
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: providerColor(p.provider),
                      }} />
                      {p.provider}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{p.calls.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {formatCost(p.cost_usd)}
                    </span>
                    <span style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>
                      {share.toFixed(1)}%
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
