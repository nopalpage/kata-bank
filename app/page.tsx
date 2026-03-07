// app/page.tsx — Homepage
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import Link from 'next/link'
import type { Article } from '@/types'
import type { Metadata } from 'next'
import { CATEGORIES } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Sambung Kata — Panduan & Strategi Game Roblox',
}

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const { data: featured } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: latest } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12)

  const { data: popular } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(4)

  const featuredArticle = featured?.[0] as Article | undefined
  const latestArticles = (latest ?? []) as Article[]
  const popularArticles = (popular ?? []) as Article[]

  const WORD_PAIRS = [
    ['MAKAN', 'NASI'], ['SAPI', 'IKAN'], ['NASI', 'IKAT'], ['IKAT', 'TULIS'],
    ['TULIS', 'SURAT'], ['SURAT', 'TINTA'], ['TINTA', 'AKHIR'], ['AKHIR', 'RUSAK'],
  ]

  return (
    <>
      <Header />

      <main style={{ paddingTop: 80, minHeight: '100vh' }}>
        <style>{`
          .category-link {
            background: var(--surface);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 14px;
            padding: 18px 16px;
            display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
            transition: all 0.22s ease;
            text-decoration: none;
          }
          .category-link:hover {
            border-color: var(--hover-border) !important;
            background: var(--surface2) !important;
            transform: translateY(-2px);
          }
          .popular-link {
            display: flex; align-items: center; gap: 16px;
            background: var(--surface);
            border-radius: 12px; padding: 16px 20px;
            margin-bottom: 4px; transition: all 0.2s ease;
            border: 1px solid rgba(255,255,255,0.07);
            text-decoration: none;
          }
          .popular-link:hover {
            background: var(--surface2) !important;
            border-color: rgba(255,107,53,0.3) !important;
          }
        `}</style>

        {/* ── HERO ── */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0 60px' }}>
          {/* BG gradient blobs */}
          <div style={{
            position: 'absolute', top: -100, left: -100,
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: -80,
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(78,205,196,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center' }}>
              <div style={{ animation: 'fadeUp 0.6s ease forwards' }}>
                {/* Live badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
                  padding: '6px 14px', borderRadius: 99,
                  fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--orange)', marginBottom: 20,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', animation: 'pulse 1.5s ease infinite', display: 'block' }} />
                  Aktif di Roblox
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3rem, 8vw, 6.5rem)',
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                  marginBottom: 12,
                }}>
                  <span style={{ color: 'var(--text)' }}>SAMBUNG</span>
                  <br />
                  <span style={{ color: 'var(--orange)', textShadow: '0 0 40px rgba(255,107,53,0.4)' }}>KATA</span>
                </h1>

                <p style={{
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  color: 'var(--text2)', lineHeight: 1.7,
                  maxWidth: 540, marginBottom: 28,
                }}>
                  Panduan lengkap strategi, kosakata KBBI, dan tips trik untuk memenangkan
                  permainan Sambung Kata di Roblox. Jadilah yang terbaik!
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a
                    href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'var(--orange)', color: '#fff',
                      padding: '12px 24px', borderRadius: 12,
                      fontWeight: 800, fontSize: '0.95rem',
                      boxShadow: '0 8px 32px rgba(255,107,53,0.4)',
                      transition: 'all 0.25s',
                      textDecoration: 'none',
                    }}
                  >
                    🎮 Main di Roblox
                  </a>
                  <Link
                    href="/kategori/panduan"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'transparent', color: 'var(--text)',
                      padding: '12px 24px', borderRadius: 12,
                      fontWeight: 700, fontSize: '0.95rem',
                      border: '1px solid rgba(255,255,255,0.15)',
                      transition: 'all 0.25s',
                      textDecoration: 'none',
                    }}
                  >
                    📚 Panduan Pemula
                  </Link>
                </div>
              </div>

              {/* Word chain animation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.75 }}>
                {WORD_PAIRS.slice(0, 5).map(([word1, word2], i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    animation: `fadeUp 0.4s ease ${i * 0.1}s both`,
                  }}>
                    {word1.split('').map((l, j) => (
                      <div key={j} className="letter-tile" style={{
                        width: 30, height: 30, fontSize: '0.75rem',
                        background: j === word1.length - 1 ? 'rgba(255,107,53,0.2)' : 'var(--surface2)',
                        borderColor: j === word1.length - 1 ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)',
                        color: j === word1.length - 1 ? 'var(--orange)' : 'var(--text2)',
                      }}>
                        {l}
                      </div>
                    ))}
                    <span style={{ color: 'var(--text3)', fontSize: '0.7rem', marginLeft: 2, marginRight: 2 }}>→</span>
                    <div className="letter-tile" style={{
                      width: 30, height: 30, fontSize: '0.75rem',
                      background: 'rgba(78,205,196,0.2)',
                      borderColor: 'rgba(78,205,196,0.5)',
                      color: 'var(--teal)',
                    }}>
                      {word2[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURED ARTICLE ── */}
        {featuredArticle && (
          <section style={{ padding: '20px 0 40px' }}>
            <div className="container">
              <ArticleCard article={featuredArticle} featured />
            </div>
          </section>
        )}

        {/* ── CATEGORIES ── */}
        <section style={{ padding: '40px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '0.04em' }}>
                KATEGORI
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {Object.entries(CATEGORIES).map(([slug, cat]) => (
                <Link key={slug} href={`/kategori/${slug}`}
                  className="category-link"
                  style={{ '--hover-border': `${cat.color}50` } as React.CSSProperties}
                >
                  <div style={{
                    fontSize: '1.6rem', width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${cat.color}18`, borderRadius: 8,
                  }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text)', lineHeight: 1.3 }}>{cat.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', lineHeight: 1.5 }}>{cat.description}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── LATEST ARTICLES ── */}
        {latestArticles.length > 0 && (
          <section style={{ padding: '40px 0' }}>
            <div className="container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '0.04em' }}>
                  ARTIKEL TERBARU
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {latestArticles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── POPULAR ARTICLES ── */}
        {popularArticles.length > 0 && (
          <section style={{ padding: '40px 0' }}>
            <div className="container">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '0.04em', marginBottom: 24 }}>
                🔥 PALING BANYAK DIBACA
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {popularArticles.map((article, i) => (
                  <Link key={article.id} href={`/artikel/${article.slug}`}
                    className="popular-link"
                  >
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2rem', color: i === 0 ? 'var(--orange)' : 'var(--text3)',
                      width: 40, textAlign: 'center', flexShrink: 0, lineHeight: 1,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 4 }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text3)', display: 'flex', gap: 12 }}>
                        <span>{getCategoryIcon(article.category)} {getCategoryName(article.category)}</span>
                        <span>👁 {article.view_count.toLocaleString('id-ID')} views</span>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA BANNER ── */}
        <section style={{ padding: '40px 0 60px' }}>
          <div className="container">
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(78,205,196,0.1) 100%)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: 24, padding: 48, textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -40, right: -40,
                fontSize: '10rem', opacity: 0.06, fontFamily: 'var(--font-display)',
              }}>⛓</div>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎮</div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                color: 'var(--text)', marginBottom: 12, letterSpacing: '0.04em',
              }}>
                SIAP BERMAIN?
              </h2>
              <p style={{ color: 'var(--text2)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.7 }}>
                Terapkan semua strategi yang kamu pelajari di sini.
                Buka Sambung Kata di Roblox dan tunjukkan kemampuan kamu!
              </p>
              <a
                href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'var(--orange)', color: '#fff',
                  padding: '14px 32px', borderRadius: 14,
                  fontWeight: 800, fontSize: '1rem',
                  boxShadow: '0 8px 40px rgba(255,107,53,0.5)',
                  textDecoration: 'none',
                }}
              >
                🎮 Buka Sambung Kata di Roblox
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <path d="M15 3h6v6M10 14L21 3" />
                </svg>
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}

function getCategoryIcon(slug: string): string {
  return CATEGORIES[slug]?.icon ?? '📝'
}
function getCategoryName(slug: string): string {
  return CATEGORIES[slug]?.name ?? slug
}
