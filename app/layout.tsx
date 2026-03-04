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
  metadataBase: new URL('https://kata-bank.vercel.app'),
  title: 'Kata Bank — Penyimpan Kata & Kalimat Cerdas (Lexica App)',
  description: 'Aplikasi pencatatan bahasa modern. Simpan, kelola, dan cari kosa kata, kalimat, serta penjelasan dengan mudah. Fitur import/export JSON dan CSV. Tersedia Dark & Light mode.',
  keywords: ['vocabulary', 'kata', 'kalimat', 'catatan bahasa', 'kata bank', 'kamus pribadi', 'belajar bahasa', 'pencatat kata', 'vocab tracker'],
  authors: [{ name: 'Naufal Page', url: 'https://github.com/nopalpage' }],
  creator: 'Naufal Page',
  publisher: 'Naufal Page',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Kata Bank — Lexica App',
    description: 'Penyimpan kata & kalimat personal. Fitur pencarian canggih dan sinkronisasi real-time.',
    url: 'https://kata-bank.vercel.app',
    siteName: 'Kata Bank',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kata Bank — Kelola Kosakata Anda',
    description: 'Simpan dan kelola kata-kata, kalimat, dan penjelasan dengan mudah.',
    creator: '@nopalpage',
  },
  verification: {
    google: 'google-site-verification-id-anda', // Ganti dengan ID Asli Anda
  }
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
      <head>
        {/* Placeholder Script PropellerAds (Native Push/Popunder) */}
        <script data-cfasync="false" src="//XXXXXX.propellerads.com/xxxx/xxx.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
