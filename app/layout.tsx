// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://sambungkata.vercel.app'),
  title: {
    default: 'Sambung Kata — Panduan & Strategi Game Roblox',
    template: '%s | Sambung Kata',
  },
  description: 'Artikel strategi, kosakata, dan tips trik untuk memenangkan permainan Sambung Kata di Roblox. Pelajari kata-kata KBBI yang jarang diketahui dan jadilah juara!',
  keywords: ['sambung kata', 'roblox', 'kata-kata', 'strategi', 'kbbi', 'bahasa indonesia', 'permainan kata'],
  authors: [{ name: 'Tim Sambung Kata' }],
  creator: 'Tim Sambung Kata',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Sambung Kata',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
