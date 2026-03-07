'use client'
// components/ArticleCard.tsx
import Link from 'next/link'
import type { Article } from '@/types'
import { formatDateShort, getCategoryName, getCategoryColor, getCategoryIcon, readTime } from '@/lib/utils'

interface Props {
  article: Article
  featured?: boolean
}

export default function ArticleCard({ article, featured = false }: Props) {
  const catColor = getCategoryColor(article.category)
  const catName = getCategoryName(article.category)
  const catIcon = getCategoryIcon(article.category)
  const minutes = readTime(article.content)

  if (featured) {
    return (
      <Link href={`/artikel/${article.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
        <article style={{
          position: 'relative',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 40,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = catColor
          el.style.transform = 'translateY(-3px)'
          el.style.boxShadow = `0 20px 60px ${catColor}22`
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(255,255,255,0.1)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}>
          {/* BG decoration */}
          <div style={{
            position: 'absolute', top: -30, right: -20,
            fontSize: '8rem', opacity: 0.06, userSelect: 'none',
            fontFamily: 'var(--font-display)',
          }}>
            {article.cover_emoji || catIcon}
          </div>

          {/* Featured badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              background: catColor, color: '#fff',
              padding: '4px 12px', borderRadius: 99,
              fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginRight: 8,
            }}>
              ⭐ Unggulan
            </span>
            <span style={{
              background: `${catColor}20`, color: catColor,
              padding: '4px 12px', borderRadius: 99,
              fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              border: `1px solid ${catColor}40`,
            }}>
              {catIcon} {catName}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            color: 'var(--text)',
            lineHeight: 1.1,
            marginBottom: 14,
            letterSpacing: '0.03em',
          }}>
            {article.title}
          </h2>

          {article.excerpt && (
            <p style={{ color: 'var(--text2)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 20 }}>
              {article.excerpt}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              🕐 {minutes} menit baca
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              📅 {formatDateShort(article.created_at)}
            </span>
            {article.view_count > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                👁 {article.view_count.toLocaleString('id-ID')}
              </span>
            )}
            <span style={{
              marginLeft: 'auto',
              color: catColor, fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Baca <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/artikel/${article.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
      <article style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 24,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = `${catColor}50`
        el.style.background = 'var(--surface2)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.07)'
        el.style.background = 'var(--surface)'
        el.style.transform = 'translateY(0)'
      }}>
        {/* Emoji / icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${catColor}18`,
          border: `1px solid ${catColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          {article.cover_emoji || catIcon}
        </div>

        {/* Category */}
        <div>
          <span style={{
            background: `${catColor}18`, color: catColor,
            padding: '2px 9px', borderRadius: 99,
            fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {catName}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
          color: 'var(--text)',
          lineHeight: 1.2,
          letterSpacing: '0.02em',
          flex: 1,
        }}>
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p style={{
            fontSize: '0.84rem', color: 'var(--text3)',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {article.excerpt}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>🕐 {minutes} mnt</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{formatDateShort(article.created_at)}</span>
        </div>
      </article>
    </Link>
  )
}
