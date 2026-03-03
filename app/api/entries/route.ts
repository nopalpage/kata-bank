// app/api/entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateUpdateEntry, parseTags, isValidUUID } from '@/lib/validation'
import { checkRateLimit, WRITE_RATE_LIMIT, getClientIP, rateLimitHeaders } from '@/lib/rate-limit'
import type { Database } from '@/types'

const SELECT_COLUMNS = 'id,user_id,type,title,content,tags,is_favorite,created_at,updated_at'

// Tipe update yang aman — didefinisikan langsung dari Database generics
// tanpa alias `EntryUpdate` yang menyebabkan TypeScript salah resolve ke `never`
type EntryUpdate = Database['public']['Tables']['entries']['Update']

// ── PATCH /api/entries/:id ────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const ip = getClientIP(request)
  const rl = checkRateLimit(`write:${ip}`, WRITE_RATE_LIMIT)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Terlalu banyak request.' },
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
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Format JSON tidak valid' }, { status: 400 }) }

  const errors = validateUpdateEntry(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].message, errors }, { status: 422 })
  }

  const b = body as Record<string, unknown>

  // Bangun object update secara eksplisit — tidak menggunakan type alias
  // agar Supabase TS generics dapat me-resolve tipe dengan benar
  const update: EntryUpdate = {}
  if (b.content     !== undefined) update.content     = String(b.content).trim()
  if (b.title       !== undefined) update.title       = b.title ? String(b.title).trim() : null
  if (b.type        !== undefined) update.type        = b.type as EntryUpdate['type']
  if (b.tags        !== undefined) update.tags        = parseTags(b.tags as string[])
  if (b.is_favorite !== undefined) update.is_favorite = Boolean(b.is_favorite)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  // Cast ke `Omit<EntryUpdate, never>` agar Supabase client tidak ambiguous
  const { data, error } = await supabase
    .from('entries')
    .update(update as NonNullable<typeof update>)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Entry tidak ditemukan' }, { status: 404 })
    }
    console.error('[PATCH /api/entries/:id]', error.code, error.message)
    return NextResponse.json({ error: 'Gagal memperbarui entry' }, { status: 500 })
  }

  return NextResponse.json({ data }, { headers: rateLimitHeaders(rl) })
}

// ── DELETE /api/entries/:id ───────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const ip = getClientIP(request)
  const rl = checkRateLimit(`write:${ip}`, WRITE_RATE_LIMIT)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Terlalu banyak request.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[DELETE /api/entries/:id]', error.code, error.message)
    return NextResponse.json({ error: 'Gagal menghapus entry' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) })
}
