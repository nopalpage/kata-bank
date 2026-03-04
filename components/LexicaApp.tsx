// components/LexicaApp.tsx
'use client'

import {
  useState, useEffect, useMemo, useCallback, useRef, memo
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { LIMITS, parseTags } from '@/lib/validation'
import type { Entry, EntryType, CreateEntryInput, UpdateEntryInput, SortOption, FilterType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

interface Props {
  user: { id: string; email: string; name: string }
  initialEntries: Entry[]
}

type SyncStatus = 'synced' | 'syncing' | 'error'
type SearchMode = 'prefix' | 'middle' | 'suffix'

const PLACEHOLDERS: Record<EntryType, string> = {
  word: 'Tulis kata di sini...',
  sentence: 'Tulis kalimat di sini...',
  explanation: 'Tulis isi penjelasan di sini...',
}

const TYPE_LABEL: Record<EntryType, string> = {
  word: 'Kata', sentence: 'Kalimat', explanation: 'Penjelasan'
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function showToast(msg: string) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2400)
}

function exportJSON(entries: Entry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url, download: `lexica-backup-${new Date().toISOString().slice(0, 10)}.json`
  })
  a.click()
  URL.revokeObjectURL(url)
  showToast('📦 Exported JSON!')
}

function exportCSV(entries: Entry[]) {
  const header = 'id,type,title,content,tags,is_favorite,created_at\n'
  const rows = entries.map(e =>
    [e.id, e.type, e.title ?? '', `"${e.content.replace(/"/g, '""')}"`,
    e.tags.join(';'), e.is_favorite, e.created_at].join(',')
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url, download: `lexica-backup-${new Date().toISOString().slice(0, 10)}.csv`
  })
  a.click()
  URL.revokeObjectURL(url)
  showToast('📊 Exported CSV!')
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LexicaApp({ user, initialEntries }: Props) {
  // Buat client sekali, tidak perlu di tiap render
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // ── Core data state ──
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')

  // ── Theme State ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isMounted, setIsMounted] = useState(false)

  // ── Import JSON State ──
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Filter/sort state ──
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  const [currentTag, setCurrentTag] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // ── Search state ──
  const [activeModes, setActiveModes] = useState<Set<SearchMode>>(new Set(['prefix']))
  const [rawPrefix, setRawPrefix] = useState('')
  const [rawMiddle, setRawMiddle] = useState('')
  const [rawSuffix, setRawSuffix] = useState('')

  // Debounce search inputs — filter tidak berjalan saat tiap keystroke
  const currentPrefix = useDebounce(rawPrefix, 150)
  const currentMiddle = useDebounce(rawMiddle, 150)
  const currentSuffix = useDebounce(rawSuffix, 150)

  // ── Form state ──
  const [currentType, setCurrentType] = useState<EntryType>('word')
  const [formContent, setFormContent] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formTags, setFormTags] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Edit state ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState('')

  // ── Modal state ──
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Ref untuk cancel in-flight requests saat component unmount
  const abortRef = useRef<AbortController | null>(null)

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`lexica-${user.id}`, { config: { presence: { key: user.id } } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEntries(prev => {
              if (prev.some(e => e.id === (payload.new as Entry).id)) return prev
              return [payload.new as Entry, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setEntries(prev =>
              prev.map(e => e.id === (payload.new as Entry).id ? payload.new as Entry : e)
            )
          } else if (payload.eventType === 'DELETE') {
            setEntries(prev => prev.filter(e => e.id !== (payload.old as Entry).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user.id])

  // ── Theme Side-Effects ────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('lexica-theme') as 'dark' | 'light'
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    if (isMounted) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('lexica-theme', theme)
    }
  }, [theme, isMounted])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Cleanup in-flight requests on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // ── API helpers ────────────────────────────────────────────────────────────
  // Buat AbortController baru untuk setiap request group
  function newAbort(): AbortSignal {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    return abortRef.current.signal
  }

  const apiSave = useCallback(async (input: CreateEntryInput): Promise<Entry | null> => {
    setSyncStatus('syncing')
    try {
      const res = await fetchWithRetry('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: newAbort(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSyncStatus('synced')
      return json.data as Entry
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return null
      setSyncStatus('error')
      showToast('❌ Gagal menyimpan. Coba lagi.')
      return null
    }
  }, [])

  const apiUpdate = useCallback(async (id: string, update: UpdateEntryInput): Promise<boolean> => {
    setSyncStatus('syncing')
    try {
      const res = await fetchWithRetry(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Update gagal')
      }
      setSyncStatus('synced')
      return true
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return false
      setSyncStatus('error')
      showToast('❌ Gagal memperbarui.')
      return false
    }
  }, [])

  const apiDelete = useCallback(async (id: string): Promise<boolean> => {
    setSyncStatus('syncing')
    try {
      const res = await fetchWithRetry(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete gagal')
      setSyncStatus('synced')
      return true
    } catch {
      setSyncStatus('error')
      showToast('❌ Gagal menghapus.')
      return false
    }
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const saveEntry = useCallback(async () => {
    if (!formContent.trim()) { showToast('⚠️ Konten tidak boleh kosong!'); return }
    if (formContent.length > LIMITS.CONTENT_MAX) {
      showToast(`⚠️ Konten terlalu panjang (maks ${LIMITS.CONTENT_MAX} karakter)`)
      return
    }
    setSaving(true)

    const input: CreateEntryInput = {
      type: currentType,
      title: formTitle.trim() || null,
      content: formContent.trim(),
      tags: parseTags(formTags),
    }

    // Optimistic update
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Entry = {
      ...input, id: tempId, user_id: user.id, is_favorite: false,
      title: input.title ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setEntries(prev => [optimistic, ...prev])
    setFormContent(''); setFormTitle(''); setFormTags('')

    const saved = await apiSave(input)
    if (saved) {
      setEntries(prev => prev.map(e => e.id === tempId ? saved : e))
      showToast('✅ Tersimpan!')
    } else {
      setEntries(prev => prev.filter(e => e.id !== tempId)) // rollback
    }
    setSaving(false)
  }, [formContent, formTitle, formTags, currentType, user.id, apiSave])

  const saveEdit = useCallback(async (id: string) => {
    if (!editContent.trim()) { showToast('⚠️ Konten tidak boleh kosong!'); return }
    const entry = entries.find(e => e.id === id)
    if (!entry) return

    const update: UpdateEntryInput = {
      content: editContent.trim(),
      tags: parseTags(editTags),
      ...(entry.type === 'explanation' ? { title: editTitle.trim() || null } : {}),
    }

    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...update } : e))
    setEditingId(null)

    const ok = await apiUpdate(id, update)
    if (ok) showToast('✅ Diperbarui!')
    else setEntries(prev => prev.map(e => e.id === id ? entry : e))
  }, [editContent, editTitle, editTags, entries, apiUpdate])

  const toggleFavorite = useCallback(async (entry: Entry) => {
    const newVal = !entry.is_favorite
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_favorite: newVal } : e))
    await apiUpdate(entry.id, { is_favorite: newVal })
    showToast(newVal ? '⭐ Favorit!' : '☆ Dihapus dari favorit')
  }, [apiUpdate])

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    const backup = entries.find(e => e.id === id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setPendingDeleteId(null)
    const ok = await apiDelete(id)
    if (ok) showToast('🗑️ Dihapus')
    else if (backup) setEntries(prev => [backup, ...prev])
  }, [pendingDeleteId, entries, apiDelete])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }, [supabase, router])

  // ── Search scoring (memoized primitives) ──────────────────────────────────

  // Lowercase versions dihitung sekali, tidak berulang di tiap card
  const lowerPrefix = useMemo(() => currentPrefix.toLowerCase(), [currentPrefix])
  const lowerMiddle = useMemo(() => currentMiddle.toLowerCase(), [currentMiddle])
  const lowerSuffix = useMemo(() => currentSuffix.toLowerCase(), [currentSuffix])
  const hasSearch = useMemo(
    () => !!(currentPrefix || currentMiddle || currentSuffix),
    [currentPrefix, currentMiddle, currentSuffix]
  )

  const scoreWord = useCallback((w: string): boolean => {
    if (activeModes.has('prefix') && lowerPrefix && !w.startsWith(lowerPrefix)) return false
    if (activeModes.has('middle') && lowerMiddle && !w.includes(lowerMiddle)) return false
    if (activeModes.has('suffix') && lowerSuffix && !w.endsWith(lowerSuffix)) return false
    return true
  }, [activeModes, lowerPrefix, lowerMiddle, lowerSuffix])

  const scoreEntry = useCallback((text: string): number => {
    if (!hasSearch) return 0
    const words = text.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return Infinity
    let best = Infinity
    for (let i = 0; i < words.length; i++) {
      if (scoreWord(words[i])) { best = Math.min(best, i === 0 ? 0 : 1 + i) }
    }
    return best
  }, [hasSearch, scoreWord])

  // ── Computed: filtered + sorted list ──────────────────────────────────────
  // useMemo — recalc hanya saat dependencies berubah
  const filtered = useMemo((): Entry[] => {
    let list = entries
    if (currentFilter !== 'all') list = list.filter(e => e.type === currentFilter)
    if (currentTag) list = list.filter(e => e.tags.includes(currentTag!))
    if (showFavoritesOnly) list = list.filter(e => e.is_favorite)

    if (hasSearch) {
      return list
        .map(e => {
          const scores = [
            scoreEntry(e.content),
            e.title ? scoreEntry(e.title) : Infinity,
            ...e.tags.map(t => scoreEntry(t)),
          ]
          return { entry: e, score: Math.min(...scores) }
        })
        .filter(({ score }) => score < Infinity)
        .sort((a, b) => a.score !== b.score
          ? a.score - b.score
          : a.entry.content.localeCompare(b.entry.content)
        )
        .map(({ entry }) => entry)
    }

    // Sort (slice dulu agar tidak mutate original array)
    const sorted = list.slice()
    switch (sortOption) {
      case 'oldest':
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at)); break
      case 'alpha-asc':
        sorted.sort((a, b) => a.content.localeCompare(b.content)); break
      case 'alpha-desc':
        sorted.sort((a, b) => b.content.localeCompare(a.content)); break
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return sorted
  }, [entries, currentFilter, currentTag, showFavoritesOnly, hasSearch, sortOption, scoreEntry])

  // ── Computed: counts & tags ───────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { word: 0, sentence: 0, explanation: 0 }
    for (const e of entries) c[e.type]++
    return c
  }, [entries])

  const totalFavorites = useMemo(
    () => entries.filter(e => e.is_favorite).length,
    [entries]
  )

  const sortedTags = useMemo(() => {
    const tagMap: Record<string, number> = {}
    for (const e of entries) for (const t of e.tags) tagMap[t] = (tagMap[t] ?? 0) + 1
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1])
  }, [entries])

  const listTitle = useMemo(() =>
    showFavoritesOnly ? '⭐ Favorit'
      : currentTag ? `#${currentTag}`
        : currentFilter === 'all' ? 'Semua catatan'
          : TYPE_LABEL[currentFilter as EntryType],
    [showFavoritesOnly, currentTag, currentFilter])

  // ── Highlight search ─────────────────────────────────────────────────────
  const highlightSearch = useCallback((text: string): string => {
    if (!hasSearch) return esc(text)
    return text.split(/\s+/).map(w => {
      const wl = w.toLowerCase()
      return scoreWord(wl) ? `<mark>${esc(w)}</mark>` : esc(w)
    }).join(' ')
  }, [hasSearch, scoreWord])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveEntry()
      if (e.key === 'Escape') {
        setPendingDeleteId(null)
        setEditingId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveEntry])

  // ── Toggle search mode ────────────────────────────────────────────────────
  const toggleMode = useCallback((mode: SearchMode) => {
    setActiveModes(prev => {
      const next = new Set(prev)
      if (next.has(mode) && next.size > 1) next.delete(mode)
      else next.add(mode)
      return next
    })
  }, [])

  // ── Handlers wrapped in useCallback ─────────────────────────────────────

  const handleFilterChange = useCallback((f: FilterType) => {
    setCurrentFilter(f); setCurrentTag(null); setShowFavoritesOnly(false)
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setCurrentTag(tag); setShowFavoritesOnly(false)
  }, [])

  const handleEditOpen = useCallback((entry: Entry) => {
    setEditingId(entry.id)
    setEditContent(entry.content)
    setEditTitle(entry.title ?? '')
    setEditTags(entry.tags.join(', '))
  }, [])

  const handleClearForm = useCallback(() => {
    setFormContent(''); setFormTitle(''); setFormTags('')
  }, [])

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const imported = JSON.parse(text)
        if (!Array.isArray(imported)) throw new Error('Format salah')

        const validEntries = imported.filter(x => x.type && x.content)
        if (validEntries.length === 0) throw new Error('Kosong atau invalid')

        showToast('Mengimpor data... mohon tunggu.')

        let successCount = 0
        for (const entry of validEntries) {
          const input: CreateEntryInput = {
            type: entry.type,
            title: entry.title || null,
            content: entry.content,
            tags: Array.isArray(entry.tags) ? entry.tags : [],
          }
          const saved = await apiSave(input)
          if (saved) {
            setEntries(prev => [saved, ...prev])
            successCount++
          }
        }
        showToast(`✅ ${successCount} entri berhasil diimpor!`)
      } catch (err) {
        showToast('❌ Gagal import JSON. Format kembalian salah.')
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="lx-header">
        <div className="lx-logo">Lexi<span>ca</span></div>

        <div className="lx-sync">
          <span className={`sync-dot ${syncStatus}`} title={syncStatus} />
          <span className="lx-sync-label">
            {syncStatus === 'syncing' ? 'Menyimpan...'
              : syncStatus === 'error' ? 'Error sync'
                : 'Tersinkron'}
          </span>
        </div>

        <div className="lx-header-stats">
          <StatBadge num={counts.word} label="Kata" color="var(--word-color)" />
          <StatBadge num={counts.sentence} label="Kalimat" color="var(--sentence-color)" />
          <StatBadge num={counts.explanation} label="Penjelasan" color="var(--explanation-color)" />

          <button className="lx-icon-btn" style={{ marginLeft: 10 }} onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="lx-user-menu">
            <div className="lx-avatar" title={user.email}>
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div className="lx-user-dropdown">
              <div className="lx-dropdown-email">{user.email}</div>

              <input type="file" accept="application/json" style={{ display: 'none' }}
                ref={fileInputRef} onChange={handleImportJSON} />
              <button onClick={() => fileInputRef.current?.click()} className="lx-dropdown-item">📥 Import JSON</button>
              <button onClick={() => exportJSON(entries)} className="lx-dropdown-item">📦 Export JSON</button>
              <button onClick={() => exportCSV(entries)} className="lx-dropdown-item">📊 Export CSV</button>
              <div className="lx-dropdown-divider" />
              <button onClick={signOut} className="lx-dropdown-item danger">🚪 Keluar</button>
            </div>
          </div>
        </div>
      </header>

      <div className="lx-app">
        {/* SIDEBAR */}
        <aside className="lx-aside">

          {/* Search */}
          <section>
            <div className="lx-section-label">Cari</div>
            <div className="lx-mode-group">
              {(['prefix', 'middle', 'suffix'] as const).map(mode => (
                <button
                  key={mode}
                  className={`lx-mode-btn${activeModes.has(mode) ? ' active' : ''}`}
                  onClick={() => toggleMode(mode)}
                  aria-pressed={activeModes.has(mode)}
                  title={mode === 'prefix' ? 'Berawalan' : mode === 'middle' ? 'Mengandung' : 'Berakhiran'}
                >
                  {mode === 'prefix' ? 'aw...' : mode === 'middle' ? '...tgh...' : '...ak'}
                </button>
              ))}
            </div>
            <div className="lx-search-inputs">
              {activeModes.has('prefix') && (
                <input className="lx-search-input" placeholder="awalan... cth: men"
                  value={rawPrefix} onChange={e => setRawPrefix(e.target.value)}
                  maxLength={50} autoComplete="off" />
              )}
              {activeModes.has('middle') && (
                <input className="lx-search-input" placeholder="...tengah... cth: ala"
                  value={rawMiddle} onChange={e => setRawMiddle(e.target.value)}
                  maxLength={50} autoComplete="off" />
              )}
              {activeModes.has('suffix') && (
                <input className="lx-search-input" placeholder="...akhiran cth: kan"
                  value={rawSuffix} onChange={e => setRawSuffix(e.target.value)}
                  maxLength={50} autoComplete="off" />
              )}
            </div>
          </section>

          {/* Type filter */}
          <section>
            <div className="lx-section-label">Tipe</div>
            <div className="lx-filter-btns">
              {(['all', 'word', 'sentence', 'explanation'] as const).map(f => (
                <button key={f}
                  className={`lx-filter-btn${currentFilter === f && !showFavoritesOnly ? ' active' : ''}`}
                  onClick={() => handleFilterChange(f)}
                  aria-current={currentFilter === f && !showFavoritesOnly}
                >
                  <span className={`dot dot-${f}`} />
                  {f === 'all' ? 'Semua' : TYPE_LABEL[f]}
                  <span className="lx-fcount">{f === 'all' ? entries.length : counts[f]}</span>
                </button>
              ))}
              {totalFavorites > 0 && (
                <button
                  className={`lx-filter-btn${showFavoritesOnly ? ' active' : ''}`}
                  onClick={() => { setShowFavoritesOnly(true); setCurrentTag(null) }}
                >
                  <span style={{ fontSize: '0.8rem' }}>⭐</span> Favorit
                  <span className="lx-fcount">{totalFavorites}</span>
                </button>
              )}
            </div>
          </section>

          {/* Sort */}
          <section>
            <div className="lx-section-label">Urutan</div>
            <select value={sortOption} onChange={e => setSortOption(e.target.value as SortOption)}
              className="lx-sort-select" aria-label="Urutkan entries">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="alpha-asc">A → Z</option>
              <option value="alpha-desc">Z → A</option>
            </select>
          </section>

          {/* Tags */}
          <section>
            <div className="lx-section-label">Tags</div>
            <div className="lx-tags-cloud" role="list">
              {sortedTags.length === 0
                ? <span className="lx-no-tags">Belum ada tag</span>
                : <>
                  {currentTag && (
                    <span className="lx-tag-chip clear-tag" onClick={() => setCurrentTag(null)}
                      role="button" tabIndex={0}>✕ semua</span>
                  )}
                  {sortedTags.map(([tag, count]) => (
                    <span key={tag} role="listitem"
                      className={`lx-tag-chip${currentTag === tag ? ' active' : ''}`}
                      onClick={() => handleTagClick(tag)}
                      tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleTagClick(tag)}
                    >
                      #{tag} <small>{count}</small>
                    </span>
                  ))}
                </>
              }
            </div>
          </section>
        </aside>

        {/* MAIN */}
        <main className="lx-main">

          {/* ADD FORM */}
          <div className="lx-add-form" role="form" aria-label="Tambah entry baru">
            <div className="lx-form-row">
              <div className="lx-type-group" role="radiogroup" aria-label="Pilih tipe">
                {(['word', 'sentence', 'explanation'] as const).map(t => (
                  <button key={t}
                    className={`lx-type-btn${currentType === t ? ` active-${t}` : ''}`}
                    onClick={() => setCurrentType(t)}
                    role="radio" aria-checked={currentType === t}
                  >
                    {t === 'word' ? '📝' : t === 'sentence' ? '💬' : '📖'} {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {currentType === 'explanation' && (
              <input type="text" className="lx-input-title"
                placeholder="Judul penjelasan..."
                value={formTitle} onChange={e => setFormTitle(e.target.value.slice(0, LIMITS.TITLE_MAX))}
                maxLength={LIMITS.TITLE_MAX} aria-label="Judul penjelasan"
              />
            )}

            <textarea className="lx-textarea"
              placeholder={PLACEHOLDERS[currentType]}
              value={formContent} onChange={e => setFormContent(e.target.value.slice(0, LIMITS.CONTENT_MAX))}
              maxLength={LIMITS.CONTENT_MAX}
              aria-label="Konten entry"
            />

            {/* Character counter */}
            {formContent.length > LIMITS.CONTENT_MAX * 0.9 && (
              <div className="lx-char-counter" aria-live="polite">
                {formContent.length}/{LIMITS.CONTENT_MAX}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <input type="text" className="lx-input"
                placeholder="Tags: pisahkan koma (maks 20 tag)"
                value={formTags} onChange={e => setFormTags(e.target.value.slice(0, LIMITS.TAGS_STRING_MAX))}
                maxLength={LIMITS.TAGS_STRING_MAX} aria-label="Tags"
              />
              <div className="lx-tags-hint">
                💡 Tags opsional · <kbd>Ctrl+Enter</kbd> simpan
              </div>
            </div>

            <div className="lx-form-actions">
              <button className="lx-btn lx-btn-ghost" onClick={handleClearForm}
                type="button">Bersihkan</button>
              <button className="lx-btn lx-btn-primary" onClick={saveEntry}
                disabled={saving || !formContent.trim()} type="button"
                aria-busy={saving}>
                {saving
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                  : 'Simpan'}
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="lx-list-header">
            <div className="lx-list-title">{listTitle}</div>
            <div className="lx-list-count" aria-live="polite">
              {filtered.length > 0 ? `${filtered.length} entri` : ''}
            </div>
          </div>

          <div className="lx-cards-grid" role="list">
            {filtered.length === 0 ? (
              <div className="lx-empty" role="status">
                <div className="lx-empty-icon">🗂️</div>
                <div className="lx-empty-text">
                  {hasSearch ? 'Tidak ada hasil untuk pencarian ini'
                    : showFavoritesOnly ? 'Belum ada entri favorit'
                      : 'Belum ada catatan di sini.\nMulai tambahkan di atas!'}
                </div>
              </div>
            ) : filtered.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                editing={editingId === entry.id}
                editContent={editContent}
                editTitle={editTitle}
                editTags={editTags}
                highlightSearch={highlightSearch}
                onEdit={() => handleEditOpen(entry)}
                onSaveEdit={() => saveEdit(entry.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => setPendingDeleteId(entry.id)}
                onCopy={() => navigator.clipboard.writeText(entry.content).then(() => showToast('📋 Disalin!'))}
                onToggleFavorite={() => toggleFavorite(entry)}
                onTagClick={handleTagClick}
                onEditContent={setEditContent}
                onEditTitle={setEditTitle}
                onEditTags={setEditTags}
              />
            ))}
          </div>
        </main>
      </div>

      {/* DELETE MODAL */}
      {pendingDeleteId && (
        <div className="lx-modal-overlay" role="dialog" aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={() => setPendingDeleteId(null)}>
          <div className="lx-modal" onClick={e => e.stopPropagation()}>
            <h3 id="delete-modal-title" className="lx-modal-title">Hapus catatan?</h3>
            <p className="lx-modal-body">
              Catatan ini akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="lx-modal-actions">
              <button className="lx-btn lx-btn-ghost" onClick={() => setPendingDeleteId(null)}
                autoFocus>Batal</button>
              <button className="lx-btn lx-btn-danger" onClick={confirmDelete}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── StatBadge ────────────────────────────────────────────────────────────────

function StatBadge({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <div className="lx-stat" aria-label={`${num} ${label}`}>
      <div className="lx-stat-num" style={{ color }}>{num}</div>
      <div className="lx-stat-label">{label}</div>
    </div>
  )
}

// ─── EntryCard — memo prevents re-render if props unchanged ──────────────────

interface EntryCardProps {
  entry: Entry; editing: boolean
  editContent: string; editTitle: string; editTags: string
  highlightSearch: (text: string) => string
  onEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void
  onDelete: () => void; onCopy: () => void; onToggleFavorite: () => void
  onTagClick: (tag: string) => void
  onEditContent: (v: string) => void; onEditTitle: (v: string) => void; onEditTags: (v: string) => void
}

const EntryCard = memo(function EntryCard({
  entry, editing, editContent, editTitle, editTags, highlightSearch,
  onEdit, onSaveEdit, onCancelEdit, onDelete, onCopy, onToggleFavorite,
  onTagClick, onEditContent, onEditTitle, onEditTags,
}: EntryCardProps) {
  const date = useMemo(() =>
    new Date(entry.created_at).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    }),
    [entry.created_at]
  )

  if (editing) {
    return (
      <div className={`lx-card type-${entry.type} editing`} role="listitem">
        <div className="lx-edit-header">
          <span className={`lx-badge badge-${entry.type}`}>{TYPE_LABEL[entry.type]}</span>
          <span className="lx-edit-label">Mode Edit</span>
        </div>
        {entry.type === 'explanation' && (
          <input type="text" className="lx-input lx-input-title" style={{ marginBottom: 10 }}
            value={editTitle} onChange={e => onEditTitle(e.target.value)}
            placeholder="Judul penjelasan..." maxLength={LIMITS.TITLE_MAX} />
        )}
        <textarea className="lx-textarea" style={{ minHeight: 80 }}
          value={editContent} onChange={e => onEditContent(e.target.value)}
          maxLength={LIMITS.CONTENT_MAX} autoFocus />
        <input type="text" className="lx-input" style={{ marginTop: 8 }}
          value={editTags} onChange={e => onEditTags(e.target.value)}
          placeholder="Tags..." maxLength={LIMITS.TAGS_STRING_MAX} />
        <div className="lx-edit-actions">
          <button className="lx-btn lx-btn-ghost" onClick={onCancelEdit}>Batal</button>
          <button className="lx-btn lx-btn-primary" onClick={onSaveEdit}
            disabled={!editContent.trim()}>Simpan</button>
        </div>
      </div>
    )
  }

  return (
    <article className={`lx-card type-${entry.type}`} role="listitem">
      <div className="lx-card-header">
        <div className="lx-card-meta">
          <div className="lx-card-badges">
            <span className={`lx-badge badge-${entry.type}`}>{TYPE_LABEL[entry.type]}</span>
            {entry.is_favorite && <span aria-label="Favorit">⭐</span>}
          </div>
          {entry.title && (
            <h3 className="lx-card-title"
              dangerouslySetInnerHTML={{ __html: highlightSearch(entry.title) }} />
          )}
        </div>
        <div className="lx-card-actions">
          <button className="lx-icon-btn" title="Salin" onClick={onCopy} aria-label="Salin konten">📋</button>
          <button className="lx-icon-btn" title={entry.is_favorite ? 'Hapus favorit' : 'Tandai favorit'}
            onClick={onToggleFavorite} aria-label={entry.is_favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}>
            {entry.is_favorite ? '⭐' : '☆'}
          </button>
          <button className="lx-icon-btn" title="Edit" onClick={onEdit} aria-label="Edit">✏️</button>
          <button className="lx-icon-btn delete" title="Hapus" onClick={onDelete} aria-label="Hapus">🗑️</button>
        </div>
      </div>

      <p className="lx-card-content"
        dangerouslySetInnerHTML={{ __html: highlightSearch(entry.content) }} />

      {entry.tags.length > 0 && (
        <div className="lx-card-tags" aria-label="Tags">
          {entry.tags.map(t => (
            <button key={t} className="lx-card-tag" onClick={() => onTagClick(t)}
              aria-label={`Filter tag ${t}`}>#{t}</button>
          ))}
        </div>
      )}
      <time className="lx-card-date" dateTime={entry.created_at}>{date}</time>
    </article>
  )
})

// ─── Inline CSS ────────────────────────────────────────────────────────────────

const CSS = `
/* Layout */
.lx-header {
  padding: 14px 28px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; background: rgba(14,14,17,0.95);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  z-index: 100; gap: 16px;
}
.lx-logo { font-family:var(--font-playfair),serif; font-size:1.5rem; font-weight:700; letter-spacing:-0.5px; flex-shrink:0; }
.lx-logo span { color:var(--accent); }

/* Sync indicator */
.lx-sync { display:flex; align-items:center; gap:6px; }
.lx-sync-label { font-size:0.7rem; color:var(--text3); white-space:nowrap; }

/* Stats */
.lx-header-stats { display:flex; align-items:center; gap:14px; }
.lx-stat { text-align:center; line-height:1.2; }
.lx-stat-num { font-family:var(--font-dm-mono),monospace; font-size:0.95rem; font-weight:500; }
.lx-stat-label { font-size:0.6rem; color:var(--text3); text-transform:uppercase; letter-spacing:1px; }

/* Avatar/Dropdown */
.lx-user-menu { position:relative; }
.lx-avatar {
  width:32px; height:32px; border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex; align-items:center; justify-content:center;
  font-size:0.8rem; font-weight:700; color:#0e0e11; cursor:pointer;
  user-select:none; flex-shrink:0;
}
.lx-user-dropdown {
  display:none; position:absolute; right:0; top:calc(100% + 8px);
  background:var(--surface); border:1px solid var(--border);
  border-radius:10px; min-width:190px; z-index:200;
  box-shadow:0 8px 32px rgba(0,0,0,0.45);
  overflow:hidden;
}
.lx-user-menu:hover .lx-user-dropdown,
.lx-user-menu:focus-within .lx-user-dropdown { display:block; }
.lx-dropdown-email { padding:10px 14px; font-size:0.76rem; color:var(--text3); border-bottom:1px solid var(--border); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lx-dropdown-item { display:block; width:100%; text-align:left; background:none; border:none; padding:10px 14px; color:var(--text2); font-family:var(--font-dm-sans),sans-serif; font-size:0.83rem; cursor:pointer; transition:background 0.12s; }
.lx-dropdown-item:hover { background:var(--surface2); color:var(--text); }
.lx-dropdown-item.danger { color:var(--danger); }
.lx-dropdown-item.danger:hover { background:rgba(224,108,117,0.1); }
.lx-dropdown-divider { height:1px; background:var(--border); margin:4px 0; }

/* Main layout */
.lx-app { display:grid; grid-template-columns:280px 1fr; flex:1; }
.lx-aside { border-right:1px solid var(--border); padding:20px 16px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:calc(100vh - 57px); position:sticky; top:57px; }
.lx-main { padding:24px 28px; overflow-y:auto; height:calc(100vh - 57px); }

/* Section label */
.lx-section-label { font-size:0.6rem; text-transform:uppercase; letter-spacing:1.5px; color:var(--text3); font-weight:500; margin-bottom:8px; }

/* Search */
.lx-mode-group { display:flex; gap:4px; margin-bottom:7px; }
.lx-mode-btn { flex:1; background:var(--surface2); border:1px solid var(--border); border-radius:7px; padding:6px 4px; color:var(--text3); font-family:var(--font-dm-mono),monospace; font-size:0.7rem; cursor:pointer; transition:all var(--transition); text-align:center; }
.lx-mode-btn:hover { border-color:var(--accent2); color:var(--text2); }
.lx-mode-btn.active { background:rgba(124,111,205,0.18); border-color:var(--accent2); color:var(--accent2); }
.lx-search-inputs { display:flex; flex-direction:column; gap:5px; }
.lx-search-input { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); padding:8px 11px; color:var(--text); font-family:var(--font-dm-sans),sans-serif; font-size:0.83rem; outline:none; width:100%; transition:border-color var(--transition); }
.lx-search-input:focus { border-color:var(--accent); }
.lx-search-input::placeholder { color:var(--text3); }

/* Filter buttons */
.lx-filter-btns { display:flex; flex-direction:column; gap:4px; }
.lx-filter-btn { background:none; border:1px solid var(--border); border-radius:var(--radius); padding:7px 11px; color:var(--text2); font-family:var(--font-dm-sans),sans-serif; font-size:0.82rem; cursor:pointer; text-align:left; display:flex; align-items:center; gap:9px; transition:all var(--transition); }
.lx-filter-btn:hover { border-color:var(--accent); color:var(--text); }
.lx-filter-btn.active { background:var(--surface2); border-color:var(--accent); color:var(--text); }
.lx-fcount { margin-left:auto; font-family:var(--font-dm-mono),monospace; font-size:0.7rem; color:var(--text3); background:var(--surface3); padding:1px 6px; border-radius:99px; }
.dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.dot-all { background:linear-gradient(135deg,var(--word-color),var(--accent2)); }
.dot-word { background:var(--word-color); }
.dot-sentence { background:var(--sentence-color); }
.dot-explanation { background:var(--explanation-color); }

/* Sort */
.lx-sort-select { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); padding:8px 11px; color:var(--text); font-family:var(--font-dm-sans),sans-serif; font-size:0.83rem; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23585870' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
.lx-sort-select:focus { border-color:var(--accent); }

/* Tags cloud */
.lx-tags-cloud { display:flex; flex-wrap:wrap; gap:4px; }
.lx-tag-chip { background:var(--surface2); border:1px solid var(--border); border-radius:99px; padding:3px 9px; font-size:0.7rem; color:var(--text2); cursor:pointer; transition:all var(--transition); font-family:var(--font-dm-mono),monospace; user-select:none; }
.lx-tag-chip:hover { border-color:var(--accent2); color:var(--text); }
.lx-tag-chip.active { background:var(--accent2); border-color:var(--accent2); color:#fff; }
.lx-tag-chip.clear-tag { border-color:var(--text3); color:var(--text3); }
.lx-no-tags { font-size:0.75rem; color:var(--text3); font-style:italic; }

/* Add form */
.lx-add-form { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:22px; }
.lx-add-form:focus-within { border-color:var(--surface3); }
.lx-form-row { display:flex; gap:8px; margin-bottom:11px; }
.lx-type-group { display:flex; gap:6px; flex-wrap:wrap; }
.lx-type-btn { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:6px 12px; color:var(--text2); font-family:var(--font-dm-sans),sans-serif; font-size:0.8rem; cursor:pointer; transition:all var(--transition); }
.lx-type-btn:hover { color:var(--text); }
.lx-type-btn.active-word       { background:rgba(200,169,110,0.15); border-color:var(--word-color);        color:var(--word-color); }
.lx-type-btn.active-sentence   { background:rgba(124,111,205,0.15); border-color:var(--sentence-color);    color:var(--sentence-color); }
.lx-type-btn.active-explanation{ background:rgba(78,175,168,0.15);  border-color:var(--explanation-color); color:var(--explanation-color); }

/* Inputs */
.lx-input,.lx-textarea,.lx-input-title { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); padding:9px 13px; color:var(--text); font-family:var(--font-dm-sans),sans-serif; font-size:0.87rem; outline:none; transition:border-color var(--transition); width:100%; display:block; }
.lx-input:focus,.lx-textarea:focus,.lx-input-title:focus { border-color:var(--accent); }
.lx-input::placeholder,.lx-textarea::placeholder,.lx-input-title::placeholder { color:var(--text3); }
.lx-textarea { resize:vertical; min-height:78px; line-height:1.65; }
.lx-input-title { font-family:var(--font-playfair),serif; font-size:0.92rem; margin-bottom:9px; }
.lx-tags-hint { font-size:0.68rem; color:var(--text3); margin-top:5px; }
.lx-tags-hint kbd { background:var(--surface3); border:1px solid var(--border); border-radius:3px; padding:1px 4px; font-family:var(--font-dm-mono),monospace; font-size:0.65rem; }
.lx-char-counter { font-family:var(--font-dm-mono),monospace; font-size:0.68rem; color:var(--text3); text-align:right; margin-top:3px; }

/* Buttons */
.lx-form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
.lx-btn { border:none; border-radius:8px; padding:8px 16px; font-family:var(--font-dm-sans),sans-serif; font-size:0.84rem; font-weight:500; cursor:pointer; transition:all var(--transition); display:inline-flex; align-items:center; gap:5px; }
.lx-btn:disabled { opacity:0.4; cursor:not-allowed; }
.lx-btn-ghost { background:none; color:var(--text2); border:1px solid var(--border); }
.lx-btn-ghost:hover:not(:disabled) { color:var(--text); border-color:var(--text3); }
.lx-btn-primary { background:var(--accent); color:#0e0e11; }
.lx-btn-primary:hover:not(:disabled) { background:#d9bc82; }
.lx-btn-danger { background:var(--danger); color:#fff; }
.lx-btn-danger:hover { background:#e8848d; }

/* List header */
.lx-list-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.lx-list-title { font-family:var(--font-playfair),serif; font-size:1.05rem; color:var(--text2); }
.lx-list-count { font-family:var(--font-dm-mono),monospace; font-size:0.75rem; color:var(--text3); }

/* Cards */
.lx-cards-grid { display:flex; flex-direction:column; gap:8px; }
.lx-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px 16px; transition:border-color var(--transition),background var(--transition); position:relative; overflow:hidden; animation:fadeUp 0.18s ease; contain:layout style; }
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.lx-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; border-radius:3px 0 0 3px; }
.lx-card.type-word::before       { background:var(--word-color); }
.lx-card.type-sentence::before   { background:var(--sentence-color); }
.lx-card.type-explanation::before{ background:var(--explanation-color); }
.lx-card:hover { border-color:var(--surface3); background:var(--surface2); }
.lx-card.editing { border-color:var(--accent); }

.lx-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:7px; }
.lx-card-meta { flex:1; min-width:0; }
.lx-card-badges { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.lx-badge { font-family:var(--font-dm-mono),monospace; font-size:0.6rem; text-transform:uppercase; letter-spacing:1px; padding:2px 7px; border-radius:99px; white-space:nowrap; }
.badge-word        { background:rgba(200,169,110,0.12); color:var(--word-color); }
.badge-sentence    { background:rgba(124,111,205,0.12); color:var(--sentence-color); }
.badge-explanation { background:rgba(78,175,168,0.12);  color:var(--explanation-color); }
.lx-card-title { font-family:var(--font-playfair),serif; font-size:0.98rem; color:var(--text); line-height:1.3; margin:0; overflow:hidden; text-overflow:ellipsis; }
.lx-card-actions { display:flex; gap:4px; opacity:0; transition:opacity var(--transition); flex-shrink:0; }
.lx-card:hover .lx-card-actions,.lx-card:focus-within .lx-card-actions { opacity:1; }
.lx-icon-btn { background:var(--surface3); border:none; border-radius:6px; width:27px; height:27px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text2); font-size:0.75rem; transition:all var(--transition); }
.lx-icon-btn:hover { color:var(--text); background:var(--border); }
.lx-icon-btn.delete:hover { color:var(--danger); }
.lx-card-content { color:var(--text2); font-size:0.86rem; line-height:1.65; margin:0; word-break:break-word; }
.lx-card-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:9px; }
.lx-card-tag { font-family:var(--font-dm-mono),monospace; font-size:0.66rem; background:var(--surface3); color:var(--text3); padding:2px 7px; border-radius:99px; cursor:pointer; border:none; transition:color var(--transition); }
.lx-card-tag:hover { color:var(--accent2); }
.lx-card-date { font-family:var(--font-dm-mono),monospace; font-size:0.64rem; color:var(--text3); margin-top:8px; display:block; }

/* Edit mode */
.lx-edit-header { display:flex; gap:8px; align-items:center; margin-bottom:9px; }
.lx-edit-label { font-size:0.72rem; color:var(--text3); }
.lx-edit-actions { display:flex; gap:7px; justify-content:flex-end; margin-top:11px; }

/* Empty */
.lx-empty { text-align:center; padding:60px 20px; color:var(--text3); }
.lx-empty-icon { font-size:2.5rem; margin-bottom:11px; }
.lx-empty-text { font-size:0.86rem; line-height:1.7; white-space:pre-line; }

/* Modal */
.lx-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn 0.15s ease; backdrop-filter:blur(4px); }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.lx-modal { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:26px 28px; max-width:360px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
.lx-modal-title { font-family:var(--font-playfair),serif; font-size:1.05rem; margin-bottom:8px; }
.lx-modal-body { color:var(--text2); font-size:0.86rem; margin-bottom:20px; line-height:1.6; }
.lx-modal-actions { display:flex; justify-content:flex-end; gap:8px; }

/* Responsive */
@media (max-width: 900px) {
  .lx-app { grid-template-columns: 1fr; }
  .lx-aside { display:none; }
  .lx-main { padding:16px; height:auto; }
  .lx-stat:not(:last-child) { display:none; }
}
@media (max-width: 480px) {
  .lx-header { padding:12px 16px; }
  .lx-type-group { gap:4px; }
  .lx-type-btn { font-size:0.75rem; padding:5px 9px; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .lx-card,.lx-modal-overlay,.toast { animation:none !important; transition:none !important; }
}
`
