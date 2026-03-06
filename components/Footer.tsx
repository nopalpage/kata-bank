// components/Footer.tsx
import Link from 'next/link'
import { CATEGORIES } from '@/lib/utils'

export default function Footer() {
  const year = new Date().getFullYear()
  const letters = ['S','A','M','B','U','N','G','K','A','T','A']

  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.07)',
      marginTop: 80,
      paddingTop: 60,
      paddingBottom: 32,
      background: 'linear-gradient(to bottom, transparent, rgba(13,21,37,0.8))',
    }}>
      <div className="container">
        {/* Letter tiles decorative row */}
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center',
          flexWrap: 'wrap', marginBottom: 48,
          opacity: 0.4,
        }}>
          {letters.map((l, i) => (
            <div key={i} className="letter-tile" style={{ width: 34, height: 34, fontSize: '1rem' }}>{l}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 12 }}>
              <span style={{ color: 'var(--orange)' }}>⛓</span> SambungKata
            </div>
            <p style={{ fontSize: '0.87rem', color: 'var(--text3)', lineHeight: 1.7, marginBottom: 16 }}>
              Sumber artikel terpercaya untuk memenangkan permainan Sambung Kata di Roblox.
            </p>
            <a
              href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--orange)', color: '#fff',
                padding: '7px 16px', borderRadius: 99,
                fontSize: '0.82rem', fontWeight: 700,
              }}
            >
              🎮 Buka di Roblox
            </a>
          </div>

          {/* Kategori */}
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 700, marginBottom: 14 }}>
              Kategori
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(CATEGORIES).map(([slug, cat]) => (
                <Link key={slug} href={`/kategori/${slug}`} style={{
                  fontSize: '0.875rem', color: 'var(--text2)',
                  transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{cat.icon}</span> {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Tentang Permainan */}
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 700, marginBottom: 14 }}>
              Tentang Game
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.75 }}>
              Sambung Kata adalah permainan kata berbahasa Indonesia di platform Roblox. 
              Setiap pemain harus menyambung kata dari huruf terakhir kata sebelumnya.
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              {['KBBI', 'EYD', 'Bahasa Indonesia'].map(tag => (
                <span key={tag} style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  padding: '2px 8px', borderRadius: 99,
                  fontSize: '0.7rem', color: 'var(--text3)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
            © {year} SambungKata. Dibuat dengan ❤️ untuk komunitas Roblox Indonesia.
          </span>
          <Link href="/auth" style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
