// app/artikel/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import Link from 'next/link'
import type { Article } from '@/types'
import type { Metadata } from 'next'
import { formatDate, getCategoryColor, getCategoryName, getCategoryIcon, readTime, CATEGORIES } from '@/lib/utils'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('articles')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'Artikel Tidak Ditemukan' }
  return {
    title: data.title,
    description: data.excerpt ?? undefined,
  }
}

export const revalidate = 60

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !article) notFound()

  // Increment view count
  await supabase.rpc('increment_view', { article_id: article.id })

  // Related articles
  const { data: related } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', article.category)
    .neq('id', article.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const catColor = getCategoryColor(article.category)
  const catName = getCategoryName(article.category)
  const catIcon = getCategoryIcon(article.category)
  const minutes = readTime(article.content)

  // Convert markdown-like content to HTML
  function renderContent(text: string): string {
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
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .split('\n\n')
      .map(p => p.startsWith('<') ? p : `<p>${p}</p>`)
      .join('\n')
  }

  const htmlContent = renderContent(article.content)

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80 }}>

        {/* ── ARTICLE HEADER ── */}
        <section style={{ padding: '60px 0 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
            background: `radial-gradient(ellipse at 30% 50%, ${catColor}12 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          <div className="container-narrow" style={{ position: 'relative', zIndex: 1 }}>

            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: '0.82rem', color: 'var(--text3)' }}>
              <Link href="/" style={{ color: 'var(--text3)', transition: 'color 0.2s' }}>Beranda</Link>
              <span>›</span>
              <Link href={`/kategori/${article.category}`} style={{ color: catColor }}>
                {catIcon} {catName}
              </Link>
            </nav>

            {/* Category badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                background: `${catColor}20`, color: catColor,
                padding: '5px 14px', borderRadius: 99,
                fontSize: '0.75rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                border: `1px solid ${catColor}40`,
              }}>
                {catIcon} {catName}
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              lineHeight: 1.05,
              letterSpacing: '0.03em',
              color: 'var(--text)',
              marginBottom: 20,
            }}>
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p style={{ fontSize: '1.1rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24 }}>
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${catColor}, var(--purple))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                }}>
                  {(article.author_name || 'A')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.87rem', color: 'var(--text2)', fontWeight: 600 }}>
                  {article.author_name ?? 'Tim SambungKata'}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                📅 {formatDate(article.created_at)}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                🕐 {minutes} menit baca
              </span>
              {article.view_count > 0 && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                  👁 {article.view_count.toLocaleString('id-ID')} views
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── ARTICLE CONTENT ── */}
        <section style={{ padding: '40px 0 60px' }}>
          <div className="container-narrow">
            <div className="prose" dangerouslySetInnerHTML={{ __html: htmlContent }} />

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontWeight: 700 }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {article.tags.map((tag: string) => (
                    <span key={tag} style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text2)', padding: '4px 12px', borderRadius: 99,
                      fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Roblox CTA */}
            <div style={{
              marginTop: 48,
              background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(78,205,196,0.08))',
              border: '1px solid rgba(255,107,53,0.25)',
              borderRadius: 16, padding: 28,
              display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: '2.5rem' }}>🎮</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>
                  Sudah siap mempraktikkan?
                </div>
                <div style={{ fontSize: '0.87rem', color: 'var(--text2)' }}>
                  Buka Sambung Kata di Roblox dan terapkan strategi yang baru kamu pelajari!
                </div>
              </div>
              <a
                href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--orange)', color: '#fff',
                  padding: '10px 20px', borderRadius: 10,
                  fontWeight: 700, fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                Main Sekarang →
              </a>
            </div>
          </div>
        </section>

        {/* ── RELATED ARTICLES ── */}
        {related && related.length > 0 && (
          <section style={{ padding: '40px 0 60px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="container">
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                letterSpacing: '0.04em',
                marginBottom: 24,
              }}>
                ARTIKEL TERKAIT
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {(related as Article[]).map(a => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </>
  )
}
