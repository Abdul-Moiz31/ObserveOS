'use client'

interface ChartProps {
  title: string
  height?: number
  children: React.ReactNode
}

export default function Chart({ title, height = 200, children }: ChartProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 24,
      marginBottom: 24,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
        {title}
      </h2>
      <div style={{ height }}>
        {children}
      </div>
    </div>
  )
}
