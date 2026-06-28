'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',       label: 'Overview',  icon: '📊' },
  { href: '/traces', label: 'Traces',    icon: '📝' },
  { href: '/costs',  label: 'Costs',     icon: '💰' },
  { href: '/errors', label: 'Errors',    icon: '⚠️' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        padding: '24px 0',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: '0 20px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              background: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#000',
            }}>O</div>
            <span style={{
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--text-primary)',
            }}>ObserveOS</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          padding: '16px 12px',
          flex: 1,
        }}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 2,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                fontWeight: isActive ? 500 : 400,
                fontSize: 13,
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
              }}>
                <span>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          v0.1.0
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: 220,
        flex: 1,
        padding: 32,
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  )
}
