import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brief Map',
  description: 'Turn rough briefs into structured maps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
