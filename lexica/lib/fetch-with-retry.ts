// lib/fetch-with-retry.ts
// Fetch dengan retry + exponential backoff + AbortController support

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calcDelay(attempt: number, base: number, max: number): number {
  // Exponential backoff dengan jitter
  const exp = Math.min(base * 2 ** attempt, max)
  const jitter = exp * 0.2 * Math.random()
  return Math.floor(exp + jitter)
}

export async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init)

      // Jangan retry untuk 4xx (client error) — kecuali 429 (rate limit)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return res
      }

      // 5xx atau 429 → retry
      if (!res.ok && attempt < cfg.maxAttempts - 1) {
        const delay = res.status === 429
          ? parseInt(res.headers.get('Retry-After') ?? '5') * 1000
          : calcDelay(attempt, cfg.baseDelayMs, cfg.maxDelayMs)
        await sleep(delay)
        continue
      }

      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Network error atau abort → tidak retry jika aborted
      if ((err as Error)?.name === 'AbortError') throw err
      if (attempt < cfg.maxAttempts - 1) {
        await sleep(calcDelay(attempt, cfg.baseDelayMs, cfg.maxDelayMs))
      }
    }
  }

  throw lastError ?? new Error('Request gagal setelah beberapa percobaan')
}
