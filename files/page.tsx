// app/kategori/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import type { Article } from '@/types'
import type { Metadata } from 'next'
import { CATEGORIES } from '@/lib/utils'
import Link from 'next/link'
import CategoryLinks from '@/components/CategoryLinks'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = CATEGORIES[slug]
  if (!cat) return { title: 'Kategori Tidak Ditemukan' }
  return {
    title: `${cat.name} — Artikel Sambung Kata`,
    description: cat.description,
  }
}

export const revalidate = 60

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const cat = CATEGORIES[slug]
  if (!cat) notFound()

  const supabase = await createClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', slug)
    .order('created_at', { ascending: false })

  const list = (articles ?? []) as Article[]

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80 }}>
        <section style={{ padding: '60px 0 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 50% 0%, ${cat.color}10 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            {/* Breadcrumb */}
            <nav style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: 'var(--text3)', marginBottom: 24 }}>
              <Link href="/" style={{ color: 'var(--text3)' }}>Beranda</Link>
              <span>›</span>
              <span style={{ color: cat.color }}>Kategori</span>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                fontSize: '2.5rem', width: 64, height: 64,
                background: `${cat.color}18`, border: `2px solid ${cat.color}30`,
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cat.icon}
              </div>
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  lineHeight: 1,
                }}>
                  {cat.name.toUpperCase()}
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: '0.95rem', marginTop: 6 }}>
                  {cat.description}
                </p>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>
              {list.length} artikel ditemukan
            </div>
          </div>
        </section>

        <section style={{ padding: '20px 0 60px' }}>
          <div className="container">
            {list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>{cat.icon}</div>
                <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>
                  Belum ada artikel di kategori ini. Segera hadir!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {list.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Other categories */}
        <section style={{ padding: '0 0 60px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container" style={{ paddingTop: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.04em', marginBottom: 20 }}>
              KATEGORI LAIN
            </h2>
            <CategoryLinks
              categories={Object.entries(CATEGORIES).filter(([s]) => s !== slug)}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
