interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export default function StatCard({
  label,
  value,
  sub,
  color = 'var(--text-primary)',
}: StatCardProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      transition: 'border var(--transition-fast)',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 28,
        fontWeight: 600,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          marginTop: 4,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}
