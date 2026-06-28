interface PaginationProps {
  page: number
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export default function Pagination({ page, hasNext, onPrevious, onNext }: PaginationProps) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
      <button
        onClick={onPrevious}
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
        onClick={onNext}
        disabled={!hasNext}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: !hasNext ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          cursor: !hasNext ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </div>
  )
}
