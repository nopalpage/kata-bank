// app/auth/callback/route.ts
// Handler untuk OAuth callback (Google, GitHub, dll)

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect ke app setelah login berhasil
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error — redirect ke auth dengan pesan
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}
