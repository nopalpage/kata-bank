// proxy.ts — Next.js 16 (menggantikan middleware.ts yang deprecated)
// Tugas: (1) refresh session, (2) auth guard, (3) rate limit auth endpoints

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, AUTH_RATE_LIMIT, API_RATE_LIMIT, getClientIP, rateLimitHeaders } from '@/lib/rate-limit'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)

  // ── Rate limiting ────────────────────────────────────────────────────────────
  if (pathname.startsWith('/auth') && request.method === 'POST') {
    const rl = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
        { status: 429, headers: { ...rateLimitHeaders(rl), 'Retry-After': '60' } }
      )
    }
  }

  if (pathname.startsWith('/api/')) {
    const rl = checkRateLimit(`api:${ip}`, API_RATE_LIMIT)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit tercapai. Coba lagi nanti.' },
        { status: 429, headers: { ...rateLimitHeaders(rl), 'Retry-After': '60' } }
      )
    }
  }

  // ── Supabase session refresh ─────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Auth guard ───────────────────────────────────────────────────────────────
  const isAuthPage    = pathname.startsWith('/auth')
  const isApiRoute    = pathname.startsWith('/api')
  const isStaticRoute = pathname.startsWith('/_next') || pathname.includes('.')

  if (!user && !isAuthPage && !isApiRoute && !isStaticRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage && !pathname.startsWith('/auth/callback')) {
    const next = request.nextUrl.searchParams.get('next') ?? '/'
    const url = request.nextUrl.clone()
    url.pathname = next
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
