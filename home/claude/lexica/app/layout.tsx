// app/layout.tsx

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lexica — Penyimpan Kata & Kalimat',
  description: 'Simpan, kelola, dan cari kata, kalimat, serta penjelasan dengan mudah.',
  keywords: ['vocabulary', 'kata', 'kalimat', 'catatan bahasa', 'lexica'],
  openGraph: {
    title: 'Lexica',
    description: 'Penyimpan kata & kalimat personal',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
