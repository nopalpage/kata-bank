// lib/validation.ts
// Validasi terpusat — dipakai di API routes (server) dan komponen (client)
// Tidak butuh dependency eksternal, pure TypeScript

export const LIMITS = {
  CONTENT_MAX:  5_000,  // karakter
  TITLE_MAX:      200,
  TAG_MAX_LENGTH:  50,
  TAG_MAX_COUNT:   20,
  TAGS_STRING_MAX: 500, // untuk raw input form
  PAGE_SIZE:       50,  // entri per halaman
  MAX_PAGE_SIZE:  200,
} as const

export const VALID_TYPES = ['word', 'sentence', 'explanation'] as const
export const VALID_SORTS = ['newest', 'oldest', 'alpha-asc', 'alpha-desc'] as const

// ── UUID v4 regex ──────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id)
}

// ── Tag sanitization ───────────────────────────────────────────────────────────
export function sanitizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[<>"'&;]/g, '')     // strip HTML/SQL chars
    .replace(/\s+/g, '-')         // spasi → dash
    .slice(0, LIMITS.TAG_MAX_LENGTH)
}

export function parseTags(raw: string | string[]): string[] {
  const src = Array.isArray(raw) ? raw : raw.split(',')
  return src
    .map(sanitizeTag)
    .filter(Boolean)
    .slice(0, LIMITS.TAG_MAX_COUNT)
}

// ── Create entry validation ────────────────────────────────────────────────────
export interface ValidationError {
  field: string
  message: string
}

export function validateCreateEntry(body: unknown): ValidationError[] {
  const errors: ValidationError[] = []
  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Body tidak valid' }]
  }
  const b = body as Record<string, unknown>

  // type
  if (!VALID_TYPES.includes(b.type as never)) {
    errors.push({ field: 'type', message: 'Tipe harus: word, sentence, atau explanation' })
  }

  // content
  if (typeof b.content !== 'string' || !b.content.trim()) {
    errors.push({ field: 'content', message: 'Konten tidak boleh kosong' })
  } else if (b.content.length > LIMITS.CONTENT_MAX) {
    errors.push({ field: 'content', message: `Konten maksimal ${LIMITS.CONTENT_MAX} karakter` })
  }

  // title (opsional)
  if (b.title !== undefined && b.title !== null) {
    if (typeof b.title !== 'string') {
      errors.push({ field: 'title', message: 'Judul tidak valid' })
    } else if (b.title.length > LIMITS.TITLE_MAX) {
      errors.push({ field: 'title', message: `Judul maksimal ${LIMITS.TITLE_MAX} karakter` })
    }
  }

  // tags (opsional)
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) {
      errors.push({ field: 'tags', message: 'Tags harus berupa array' })
    } else {
      if (b.tags.length > LIMITS.TAG_MAX_COUNT) {
        errors.push({ field: 'tags', message: `Maksimal ${LIMITS.TAG_MAX_COUNT} tag` })
      }
      if (b.tags.some((t: unknown) => typeof t !== 'string')) {
        errors.push({ field: 'tags', message: 'Semua tag harus string' })
      }
    }
  }

  return errors
}

export function validateUpdateEntry(body: unknown): ValidationError[] {
  const errors: ValidationError[] = []
  if (!body || typeof body !== 'object') {
    return [{ field: 'body', message: 'Body tidak valid' }]
  }
  const b = body as Record<string, unknown>

  if (b.content !== undefined) {
    if (typeof b.content !== 'string' || !b.content.trim()) {
      errors.push({ field: 'content', message: 'Konten tidak boleh kosong' })
    } else if (b.content.length > LIMITS.CONTENT_MAX) {
      errors.push({ field: 'content', message: `Konten maksimal ${LIMITS.CONTENT_MAX} karakter` })
    }
  }

  if (b.type !== undefined && !VALID_TYPES.includes(b.type as never)) {
    errors.push({ field: 'type', message: 'Tipe tidak valid' })
  }

  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.length > LIMITS.TAG_MAX_COUNT) {
      errors.push({ field: 'tags', message: `Maksimal ${LIMITS.TAG_MAX_COUNT} tag` })
    }
  }

  if (b.is_favorite !== undefined && typeof b.is_favorite !== 'boolean') {
    errors.push({ field: 'is_favorite', message: 'is_favorite harus boolean' })
  }

  return errors
}
