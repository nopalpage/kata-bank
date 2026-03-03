// app/page.tsx — Server Component
// Fetch data di server → zero client waterfall untuk initial render

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import LexicaApp from '@/components/LexicaApp'
import type { Entry } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lexica — Penyimpan Kata & Kalimat',
  description: 'Simpan, kelola, dan cari kata, kalimat, serta penjelasan secara personal.',
}

// Halaman ini adalah dynamic (tidak di-cache) karena user-spesifik
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // butuh cookies() API

export default async function HomePage() {
  const supabase = await createClient()

  // Verifikasi auth di server — tidak ada roundtrip ke client
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/auth')

  // Fetch initial data di server — dikirim sebagai props (tidak ada loading state di client)
  // Hanya kolom yang dibutuhkan, bukan SELECT *
  const { data: initialEntries, error: fetchError } = await supabase
    .from('entries')
    .select('id,user_id,type,title,content,tags,is_favorite,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200) // Initial load 200, client bisa request lebih via pagination

  if (fetchError) {
    console.error('[page.tsx] fetch entries:', fetchError.message)
  }

  const userMeta = {
    id:    user.id,
    email: user.email ?? '',
    name:  user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
  }

  return (
    <Suspense fallback={<AppSkeleton />}>
      <LexicaApp
        user={userMeta}
        initialEntries={(initialEntries as Entry[]) ?? []}
      />
    </Suspense>
  )
}

// Skeleton loader — ditampilkan saat Suspense boundary aktif
function AppSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text3)',
      fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem',
      gap: 12,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="spinner" />
        Memuat Lexica...
      </div>
    </div>
  )
}
