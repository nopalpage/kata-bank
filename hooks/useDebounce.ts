// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

/**
 * Delay update nilai sampai user berhenti mengetik.
 * Mencegah filter/render berlebihan saat mengetik cepat.
 */
export function useDebounce<T>(value: T, delayMs: number = 150): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
