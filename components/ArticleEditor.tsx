'use client'
// components/ArticleEditor.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { slugify, CATEGORIES } from '@/lib/utils'
import type { Article, CreateArticleInput } from '@/types'

interface Props {
  article?: Article
  mode: 'create' | 'edit'
}

function toast(msg: string) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

export default function ArticleEditor({ article, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState(false)

  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [category, setCategory] = useState(article?.category ?? 'strategi')
  const [tags, setTags] = useState(article?.tags?.join(', ') ?? '')
  const [coverEmoji, setCoverEmoji] = useState(article?.cover_emoji ?? '📝')
  const [isPublished, setIsPublished] = useState(article?.is_published ?? false)
  const [isFeatured, setIsFeatured] = useState(article?.is_featured ?? false)
  const [authorName, setAuthorName] = useState(article?.author_name ?? 'Tim SambungKata')

  function autoSlug() {
    if (!slug || mode === 'create') setSlug(slugify(title))
  }

  async function handleSave(publish?: boolean) {
    if (!title.trim()) { toast('⚠️ Judul tidak boleh kosong'); return }
    if (!content.trim()) { toast('⚠️ Konten tidak boleh kosong'); return }
    if (!slug.trim()) { toast('⚠️ Slug tidak boleh kosong'); return }

    setSaving(true)
    const payload: CreateArticleInput & { author_name?: string; is_published?: boolean } = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      cover_emoji: coverEmoji.trim() || null,
      is_published: publish !== undefined ? publish : isPublished,
      is_featured: isFeatured,
      author_name: authorName.trim() || 'Tim SambungKata',
    }

    try {
      const url = mode === 'create' ? '/api/articles' : `/api/articles/${article!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyimpan')
      toast(mode === 'create' ? '✅ Artikel dibuat!' : '✅ Artikel diperbarui!')
      if (mode === 'create') {
        router.push(`/admin/artikel/${json.data.id}/edit`)
      } else {
        router.refresh()
      }
    } catch (err) {
      toast(`❌ ${(err as Error).message}`)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Hapus artikel ini? Tindakan ini tidak bisa dibatalkan.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/articles/${article!.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      toast('🗑️ Artikel dihapus')
      router.push('/admin')
    } catch {
      toast('❌ Gagal menghapus artikel')
    }
    setDeleting(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#F0F4FF',
    fontFamily: "'Nunito', sans-serif",
    fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.2s',
    display: 'block',
  }

  function renderPreview(text: string): string {
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>[\n]*)+/g, '<ul>$&</ul>')
      .replace(/^---$/gm, '<hr>')
      .split('\n\n')
      .map(p => p.startsWith('<') ? p : `<p>${p}</p>`)
      .join('\n')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .ed-inp:focus { border-color:#FF6B35 !important; }
        .ed-label { font-size:0.72rem; text-transform:uppercase; letter-spacing:1.5px; color:rgba(90,106,130,0.9); font-weight:700; display:block; margin-bottom:6px; }
        .ed-checkbox { display:flex; align-items:center; gap:8px; cursor:pointer; }
        .ed-checkbox input { accent-color:#FF6B35; width:16px; height:16px; }
        .ed-toggle { padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(157,171,194,0.8); font-family:'Nunito',sans-serif; font-size:0.83rem; font-weight:600; cursor:pointer; transition:all 0.2s; }
        .ed-toggle.active { background:rgba(255,107,53,0.15); color:#FF6B35; border-color:rgba(255,107,53,0.3); }
      `}</style>

      <div style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', letterSpacing:'0.04em', color:'#F0F4FF' }}>
            {mode === 'create' ? '✍️ ARTIKEL BARU' : '✏️ EDIT ARTIKEL'}
          </h1>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              className={`ed-toggle${preview ? ' active' : ''}`}
              onClick={() => setPreview(p => !p)}
            >
              {preview ? '✏️ Edit' : '👁 Preview'}
            </button>
            {mode === 'edit' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(224,108,117,0.3)', background:'rgba(224,108,117,0.08)', color:'#E06C75', fontFamily:'Nunito,sans-serif', fontSize:'0.83rem', fontWeight:600, cursor:'pointer' }}
              >
                {deleting ? '⏳' : '🗑️ Hapus'}
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,211,61,0.3)', background:'rgba(255,211,61,0.08)', color:'#FFD93D', fontFamily:'Nunito,sans-serif', fontSize:'0.83rem', fontWeight:700, cursor:'pointer' }}
            >
              {saving ? '⏳' : '💾 Simpan Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{ padding:'7px 18px', borderRadius:8, border:'none', background:'#FF6B35', color:'#fff', fontFamily:'Nunito,sans-serif', fontSize:'0.83rem', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(255,107,53,0.4)' }}
            >
              {saving ? '⏳ Menyimpan...' : '🚀 Publikasikan'}
            </button>
          </div>
        </div>

        {preview ? (
          /* Preview mode */
          <div style={{
            background:'rgba(17,24,39,0.8)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:14, padding:32,
          }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'2.5rem', letterSpacing:'0.04em', color:'#F0F4FF', marginBottom:16 }}>
              {coverEmoji} {title || 'Judul Artikel'}
            </div>
            {excerpt && <p style={{ color:'rgba(157,171,194,0.8)', fontSize:'1rem', lineHeight:1.7, marginBottom:24, borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:24 }}>{excerpt}</p>}
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderPreview(content) }} />
          </div>
        ) : (
          /* Edit mode */
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Row 1: Title + Emoji */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:12 }}>
              <div>
                <label className="ed-label">Judul Artikel *</label>
                <input
                  className="ed-inp" style={inp}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={autoSlug}
                  placeholder="Contoh: 50 Kata Berakhiran A yang Jarang Diketahui..."
                />
              </div>
              <div>
                <label className="ed-label">Emoji Cover</label>
                <input
                  className="ed-inp" style={inp}
                  value={coverEmoji}
                  onChange={e => setCoverEmoji(e.target.value)}
                  placeholder="📝"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Row 2: Slug + Category */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="ed-label">Slug URL *</label>
                <input
                  className="ed-inp" style={inp}
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="kata-berakhiran-a"
                />
              </div>
              <div>
                <label className="ed-label">Kategori *</label>
                <select
                  className="ed-inp"
                  style={{ ...inp, cursor:'pointer' }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {Object.entries(CATEGORIES).map(([s, c]) => (
                    <option key={s} value={s}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="ed-label">Ringkasan / Excerpt</label>
              <textarea
                className="ed-inp"
                style={{ ...inp, minHeight:70, resize:'vertical' }}
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Ringkasan singkat artikel untuk ditampilkan di halaman daftar..."
                maxLength={300}
              />
            </div>

            {/* Content */}
            <div>
              <label className="ed-label">Konten Artikel * (Markdown didukung)</label>
              <div style={{ fontSize:'0.7rem', color:'rgba(90,106,130,0.8)', marginBottom:8 }}>
                Gunakan: **tebal**, *miring*, `kode`, ## Judul, ### Sub-judul, - list, &gt; kutipan
              </div>
              <textarea
                className="ed-inp"
                style={{ ...inp, minHeight:380, resize:'vertical', fontFamily:"'JetBrains Mono', monospace", fontSize:'0.87rem', lineHeight:1.7 }}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`## Pendahuluan\n\nTulis artikel di sini...\n\n## Strategi Utama\n\n- Poin pertama\n- Poin kedua\n\n## Kesimpulan\n\nKesimpulan artikel...`}
              />
              <div style={{ textAlign:'right', fontSize:'0.72rem', color:'rgba(90,106,130,0.7)', marginTop:4 }}>
                {content.length} karakter · ~{Math.ceil(content.split(/\s+/).length / 200)} menit baca
              </div>
            </div>

            {/* Tags + Author */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="ed-label">Tags (pisah koma)</label>
                <input
                  className="ed-inp" style={inp}
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="strategi, kosakata, kbbi"
                />
              </div>
              <div>
                <label className="ed-label">Nama Penulis</label>
                <input
                  className="ed-inp" style={inp}
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="Tim SambungKata"
                />
              </div>
            </div>

            {/* Options */}
            <div style={{
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:16,
              display:'flex', gap:24, flexWrap:'wrap',
            }}>
              <label className="ed-checkbox">
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                <span style={{ fontSize:'0.88rem', color:'rgba(157,171,194,0.9)', fontWeight:600 }}>✅ Publikasikan</span>
              </label>
              <label className="ed-checkbox">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
                <span style={{ fontSize:'0.88rem', color:'rgba(157,171,194,0.9)', fontWeight:600 }}>⭐ Jadikan Unggulan</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
