// app/layout.tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

// Menggunakan next/font — otomatis self-host, tidak ada warning custom font
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kata Bank — Penyimpan Kata & Kalimat',
  description: 'Simpan, kelola, dan cari kata, kalimat, serta penjelasan dengan mudah.',
  keywords: ['vocabulary', 'kata', 'kalimat', 'catatan bahasa', 'kata bank'],
  openGraph: {
    title: 'Kata Bank',
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
    <html
      lang="id"
      suppressHydrationWarning
      className={`${playfair.variable} ${dmMono.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
