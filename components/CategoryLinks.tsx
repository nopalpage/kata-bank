'use client'
// components/CategoryLinks.tsx
import Link from 'next/link'

interface Category {
  icon: string
  name: string
  color: string
}

interface Props {
  categories: [string, Category][]
}

export default function CategoryLinks({ categories }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {categories.map(([s, c]) => (
        <Link
          key={s}
          href={`/kategori/${s}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 16px', borderRadius: 99,
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--text2)',
            transition: 'all 0.2s ease', textDecoration: 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = `${c.color}50`
            ;(e.currentTarget as HTMLElement).style.color = c.color
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
          }}
        >
          {c.icon} {c.name}
        </Link>
      ))}
    </div>
  )
}
