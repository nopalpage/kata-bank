// app/api/entries/[id]/route.ts
// PATCH: update entry | DELETE: hapus entry

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateUpdateEntry, parseTags, isValidUUID } from '@/lib/validation'
import { checkRateLimit, WRITE_RATE_LIMIT, getClientIP, rateLimitHeaders } from '@/lib/rate-limit'

const SELECT_COLUMNS = 'id,user_id,type,title,content,tags,is_favorite,created_at,updated_at'

// ── PATCH /api/entries/:id ────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validasi format UUID — cegah SQL/path injection
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

  // Bangun object update hanya dengan field yang dikirim
  const update: Record<string, unknown> = {}
  if (b.content  !== undefined) update.content  = String(b.content).trim()
  if (b.title    !== undefined) update.title    = b.title ? String(b.title).trim() : null
  if (b.type     !== undefined) update.type     = b.type
  if (b.tags     !== undefined) update.tags     = parseTags(b.tags as string[])
  if (b.is_favorite !== undefined) update.is_favorite = Boolean(b.is_favorite)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 })
  }

  // RLS di Supabase otomatis pastikan user hanya bisa update miliknya
  const { data, error } = await supabase
    .from('entries')
    .update(update)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  if (error) {
    // PGRST116 = row tidak ditemukan (karena RLS atau memang tidak ada)
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

  // RLS pastikan user hanya bisa hapus miliknya
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
