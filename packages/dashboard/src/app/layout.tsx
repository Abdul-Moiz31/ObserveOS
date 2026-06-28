import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ObserveOS — LLM Observability',
  description: 'Real-time observability for your AI applications',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
