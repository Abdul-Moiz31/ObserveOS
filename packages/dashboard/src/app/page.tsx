'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { api } from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    setLoading(true)
    api.getMetrics(days)
      .then(setMetrics)
      .catch((err) => {
        console.error('Failed to load metrics:', err)
        setMetrics(null)
      })
      .finally(() => setLoading(false))
  }, [days])

  const summary = metrics?.summary

  return (
    <Layout>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 4,
          }}>Overview</h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}>Your LLM usage, costs, and performance</p>
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
            transition: 'border var(--transition-fast)',
          }}
        >
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading metrics...
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Total Calls"
              value={(summary?.total_calls ?? 0).toLocaleString()}
            />
            <StatCard
              label="Total Cost"
              value={`$${(summary?.total_cost_usd ?? 0).toFixed(4)}`}
              color="var(--accent)"
            />
            <StatCard
              label="Avg Latency"
              value={`${Math.round(summary?.avg_latency_ms ?? 0)}ms`}
            />
            <StatCard
              label="Total Tokens"
              value={(summary?.total_tokens ?? 0).toLocaleString()}
              sub="input + output"
            />
            <StatCard
              label="Errors"
              value={summary?.total_errors ?? 0}
              color={summary?.total_errors > 0 ? 'var(--danger)' : 'var(--text-primary)'}
              sub={summary?.total_calls > 0
                ? `${((summary.total_errors / summary.total_calls) * 100).toFixed(1)}% error rate`
                : undefined
              }
            />
          </div>

          {/* Charts */}
          {metrics?.byModel?.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              marginBottom: 24,
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
                Cost by Model
              </h2>
              <ResponsiveContainer width="100%" height={200}>
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
                    formatter={(v: any) => [`$${Number(v).toFixed(6)}`, 'Cost']}
                  />
                  <Bar dataKey="cost_usd" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Error Rate Chart */}
          {metrics?.errorRateByDay?.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
                Error Rate by Day
              </h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={metrics.errorRateByDay} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                    }}
                  />
                  <Line dataKey="errors" stroke="var(--danger)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
