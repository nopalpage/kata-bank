// lib/rate-limit.ts
// In-memory sliding-window rate limiter yang berjalan di Vercel Edge Runtime
// Catatan: ini per-instance. Untuk multi-instance prod, pakai Upstash Redis.

interface RateLimitEntry {
  timestamps: number[]
}

// Store per IP — dibersihkan otomatis saat entry expired
const store = new Map<string, RateLimitEntry>()

// Bersihkan store setiap 5 menit untuk cegah memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      // Hapus entry jika semua timestamp sudah expired (> 1 menit)
      if (entry.timestamps.every(t => now - t > 60_000)) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

interface RateLimitConfig {
  /** Jumlah maksimum request */
  limit: number
  /** Window waktu dalam milidetik */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number // timestamp ms
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Hapus timestamp di luar window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  const remaining = config.limit - entry.timestamps.length

  if (remaining <= 0) {
    // Kapan window pertama akan expire
    const oldestInWindow = entry.timestamps[0]
    const resetAt = oldestInWindow + config.windowMs
    return { success: false, limit: config.limit, remaining: 0, resetAt }
  }

  // Tambah timestamp baru
  entry.timestamps.push(now)

  return {
    success: true,
    limit: config.limit,
    remaining: remaining - 1,
    resetAt: now + config.windowMs,
  }
}

// ── Preset configs ─────────────────────────────────────────────────────────────

/** API umum: 60 request/menit */
export const API_RATE_LIMIT: RateLimitConfig = {
  limit: 60,
  windowMs: 60_000,
}

/** Operasi write (POST/PATCH/DELETE): 30 request/menit */
export const WRITE_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowMs: 60_000,
}

/** Auth (login/signup): 10 percobaan/15 menit — anti-brute-force */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 15 * 60_000,
}

// ── Helper: ambil IP dari request ──────────────────────────────────────────────
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ── Helper: buat response headers untuk rate limit ───────────────────────────
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
