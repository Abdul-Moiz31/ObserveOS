'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { useAlertRules, useAlertEvents } from '@/hooks/useAlerts'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import type { AlertMetric } from '@/lib/types'

const METRIC_OPTIONS: { value: AlertMetric; label: string }[] = [
  { value: 'cost_usd', label: 'Cost (USD)' },
  { value: 'error_count', label: 'Error count' },
  { value: 'error_rate', label: 'Error rate (0-1)' },
  { value: 'latency_p95', label: 'Latency p95 (ms)' },
]

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function AlertsPage() {
  const { data: rulesData, loading: rulesLoading, refetch: refetchRules } = useAlertRules()
  const { data: eventsData, loading: eventsLoading, refetch: refetchEvents } = useAlertEvents(50)

  const [name, setName] = useState('')
  const [metric, setMetric] = useState<AlertMetric>('cost_usd')
  const [windowMinutes, setWindowMinutes] = useState(60)
  const [threshold, setThreshold] = useState(10)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState(60)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await api.createAlertRule({ name, metric, windowMinutes, threshold, webhookUrl, cooldownMinutes })
      setName('')
      setWebhookUrl('')
      refetchRules()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create alert rule')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleEnabled(id: string, enabled: number) {
    await api.updateAlertRule(id, { enabled: !enabled })
    refetchRules()
  }

  async function removeRule(id: string) {
    await api.deleteAlertRule(id)
    refetchRules()
  }

  const rules = rulesData?.rules ?? []
  const events = eventsData?.events ?? []

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Alerts</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Get notified via webhook when cost, error rate, or latency exceeds a threshold you set.
        </p>
      </div>

      {/* Create rule form */}
      <form
        onSubmit={handleCreate}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        <Field label="Name">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="High daily cost" required />
        </Field>
        <Field label="Metric">
          <select style={inputStyle} value={metric} onChange={(e) => setMetric(e.target.value as AlertMetric)}>
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Threshold">
          <input
            style={inputStyle}
            type="number"
            step="any"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Window (minutes)">
          <input
            style={inputStyle}
            type="number"
            min={5}
            max={1440}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Cooldown (minutes)">
          <input
            style={inputStyle}
            type="number"
            min={5}
            max={1440}
            value={cooldownMinutes}
            onChange={(e) => setCooldownMinutes(Number(e.target.value))}
          />
        </Field>
        <Field label="Webhook URL">
          <input
            style={inputStyle}
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            required
          />
        </Field>

        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Creating...' : 'Create alert'}
          </button>
          {formError && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{formError}</span>}
        </div>
      </form>

      {/* Rules list */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 100px 100px 1fr 80px 80px',
          gap: 16,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span>Name</span>
          <span>Metric</span>
          <span>Threshold</span>
          <span>Window</span>
          <span>Webhook</span>
          <span>Enabled</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {rulesLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading rules...</div>
        ) : rules.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>No alert rules yet.</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 100px 100px 1fr 80px 80px',
              gap: 16,
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
              alignItems: 'center',
            }}>
              <span>{rule.name}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{rule.metric}</span>
              <span>{rule.threshold}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{rule.window_minutes}m</span>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rule.webhook_url}
              </span>
              <button
                onClick={() => toggleEnabled(rule.id, rule.enabled)}
                style={{
                  background: rule.enabled ? 'var(--accent-dim)' : 'transparent',
                  color: rule.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {rule.enabled ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => removeRule(rule.id)}
                style={{
                  background: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  justifySelf: 'end',
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* Recent events */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent firings</h2>
        <button
          onClick={refetchEvents}
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
        {eventsLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>No alerts have fired yet.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
            }}>
              <span>
                value <strong>{event.metric_value}</strong> exceeded threshold <strong>{event.threshold}</strong>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {event.webhook_status ? `webhook ${event.webhook_status}` : 'webhook failed'} · {timeAgo(event.triggered_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
