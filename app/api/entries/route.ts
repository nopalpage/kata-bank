// app/api/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCreateEntry, parseTags, VALID_SORTS, VALID_TYPES, LIMITS } from '@/lib/validation'
import { checkRateLimit, WRITE_RATE_LIMIT, getClientIP, rateLimitHeaders } from '@/lib/rate-limit'

const SELECT_COLUMNS = 'id,user_id,type,title,content,tags,is_favorite,created_at,updated_at'

// ── GET /api/entries ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const type      = searchParams.get('type')
  const tag       = searchParams.get('tag')
  const sort      = searchParams.get('sort') ?? 'newest'
  const favorites = searchParams.get('favorites') === 'true'
  const search    = searchParams.get('search')?.trim()
  const cursor    = searchParams.get('cursor')
  const limit     = Math.min(
    parseInt(searchParams.get('limit') ?? String(LIMITS.PAGE_SIZE), 10) || LIMITS.PAGE_SIZE,
    LIMITS.MAX_PAGE_SIZE
  )

  if (type && type !== 'all' && !VALID_TYPES.includes(type as never)) {
    return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 })
  }
  if (!VALID_SORTS.includes(sort as never)) {
    return NextResponse.json({ error: 'Sort tidak valid' }, { status: 400 })
  }
  if (tag && tag.length > LIMITS.TAG_MAX_LENGTH) {
    return NextResponse.json({ error: 'Tag terlalu panjang' }, { status: 400 })
  }

  let query = supabase.from('entries').select(SELECT_COLUMNS)

  if (type && type !== 'all') query = query.eq('type', type)
  if (tag)                    query = query.contains('tags', [tag])
  if (favorites)              query = query.eq('is_favorite', true)

  if (search && search.length >= 2) {
    query = query.textSearch('content', search, {
      type: 'websearch',
      config: 'indonesian',
    })
  }

  // Cursor pagination — if/else, bukan ternary expression statement
  if (cursor) {
    if (sort === 'oldest') {
      query = query.gt('created_at', cursor)
    } else if (sort === 'alpha-asc') {
      query = query.gt('content', cursor)
    } else if (sort === 'alpha-desc') {
      query = query.lt('content', cursor)
    } else {
      query = query.lt('created_at', cursor)
    }
  }

  switch (sort) {
    case 'oldest':     query = query.order('created_at', { ascending: true });  break
    case 'alpha-asc':  query = query.order('content',    { ascending: true });  break
    case 'alpha-desc': query = query.order('content',    { ascending: false }); break
    default:           query = query.order('created_at', { ascending: false })
  }

  query = query.limit(limit + 1)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/entries]', error.code, error.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }

  const hasMore = (data?.length ?? 0) > limit
  const items   = hasMore ? data!.slice(0, limit) : (data ?? [])

  let nextCursor: string | null = null
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1] as Record<string, unknown>
    nextCursor = (sort === 'alpha-asc' || sort === 'alpha-desc')
      ? String(last.content)
      : String(last.created_at)
  }

  return NextResponse.json({ data: items, hasMore, nextCursor }, {
    headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' },
  })
}

// ── POST /api/entries ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = checkRateLimit(`write:${ip}`, WRITE_RATE_LIMIT)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Terlalu banyak request. Tunggu sebentar.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10)
  if (contentLength > 20_000) {
    return NextResponse.json({ error: 'Payload terlalu besar' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Format JSON tidak valid' }, { status: 400 })
  }

  const errors = validateCreateEntry(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].message, errors }, { status: 422 })
  }

  const b = body as { type: string; content: string; title?: string; tags?: string[] }

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id:     user.id,
      type:        b.type,
      title:       b.title?.trim() || null,
      content:     b.content.trim(),
      tags:        parseTags(b.tags ?? []),
      is_favorite: false,
    })
    .select(SELECT_COLUMNS)
    .single()

  if (error) {
    console.error('[POST /api/entries]', error.code, error.message)
    return NextResponse.json({ error: 'Gagal menyimpan entry' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201, headers: rateLimitHeaders(rl) })
}
