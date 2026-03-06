'use client'
// components/Header.tsx
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/utils'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <style>{`
        .sk-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          transition: all 0.3s ease;
          padding: 16px 0;
        }
        .sk-header.scrolled {
          background: rgba(8,13,26,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 12px 0;
        }
        .sk-header-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px;
        }
        .sk-logo {
          font-family: var(--font-display);
          font-size: 1.7rem;
          letter-spacing: 0.06em;
          color: var(--text);
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .sk-logo .chain { color: var(--orange); }
        .sk-logo-dot {
          width: 8px; height: 8px;
          background: var(--orange);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        .sk-nav {
          display: flex; align-items: center; gap: 6px;
        }
        .sk-nav-link {
          padding: 6px 14px; border-radius: 99px;
          font-size: 0.88rem; font-weight: 600;
          color: var(--text2);
          transition: all var(--transition);
          white-space: nowrap;
        }
        .sk-nav-link:hover { color: var(--text); background: rgba(255,255,255,0.06); }
        .sk-nav-link.active { color: var(--orange); }
        .sk-header-right { display: flex; align-items: center; gap: 12px; }
        .sk-play-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--orange); color: #fff;
          padding: 8px 18px; border-radius: 99px;
          font-size: 0.85rem; font-weight: 700;
          border: none;
          transition: all var(--transition);
          box-shadow: 0 4px 20px rgba(255,107,53,0.4);
          white-space: nowrap;
          text-decoration: none;
        }
        .sk-play-btn:hover {
          background: #ff7d4d;
          box-shadow: 0 6px 28px rgba(255,107,53,0.55);
          transform: translateY(-1px);
        }
        .sk-hamburger {
          display: none; flex-direction: column; gap: 5px;
          background: none; border: none; padding: 8px;
          cursor: pointer;
        }
        .sk-hamburger span {
          display: block; width: 22px; height: 2px;
          background: var(--text2); border-radius: 2px;
          transition: all var(--transition);
        }
        .sk-mobile-menu {
          display: none;
          position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
          background: rgba(8,13,26,0.97); backdrop-filter: blur(20px);
          padding: 24px;
          flex-direction: column; gap: 8px;
          z-index: 199;
          overflow-y: auto;
        }
        .sk-mobile-menu.open { display: flex; }
        .sk-mobile-link {
          padding: 12px 16px; border-radius: var(--radius);
          font-size: 1rem; font-weight: 600;
          color: var(--text2);
          transition: all var(--transition);
          border: 1px solid transparent;
        }
        .sk-mobile-link:hover { color: var(--text); background: var(--surface); border-color: var(--border); }
        .sk-mobile-category {
          padding: 10px 16px; border-radius: var(--radius);
          font-size: 0.9rem; font-weight: 600;
          color: var(--text2); display: flex; align-items: center; gap: 10px;
          transition: all var(--transition);
        }
        .sk-mobile-category:hover { color: var(--text); background: var(--surface); }
        .sk-cat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text3); padding: 12px 0 6px; font-weight: 700; }

        @media (max-width: 900px) {
          .sk-nav { display: none; }
          .sk-hamburger { display: flex; }
        }
        @media (max-width: 600px) {
          .sk-play-btn span { display: none; }
        }
      `}</style>

      <header className={`sk-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="sk-header-inner">
            <Link href="/" className="sk-logo" onClick={() => setMenuOpen(false)}>
              <span className="chain">⛓</span>
              Sambung<span className="chain">Kata</span>
              <span className="sk-logo-dot" />
            </Link>

            <nav className="sk-nav" aria-label="Navigasi utama">
              <Link href="/" className="sk-nav-link">Beranda</Link>
              <Link href="/kategori/strategi" className="sk-nav-link">Strategi</Link>
              <Link href="/kategori/kosakata" className="sk-nav-link">Kosakata</Link>
              <Link href="/kategori/tips-trik" className="sk-nav-link">Tips & Trik</Link>
              <Link href="/kategori/panduan" className="sk-nav-link">Panduan</Link>
            </nav>

            <div className="sk-header-right">
              <a
                href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
                target="_blank" rel="noopener noreferrer"
                className="sk-play-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>Main Sekarang</span>
              </a>
              <button
                className="sk-hamburger"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}} />
                <span style={menuOpen ? { opacity: 0 } : {}} />
                <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`sk-mobile-menu${menuOpen ? ' open' : ''}`} role="dialog" aria-label="Menu mobile">
        <Link href="/" className="sk-mobile-link" onClick={() => setMenuOpen(false)}>🏠 Beranda</Link>
        <div className="sk-cat-label">Kategori</div>
        {Object.entries(CATEGORIES).map(([slug, cat]) => (
          <Link key={slug} href={`/kategori/${slug}`} className="sk-mobile-category" onClick={() => setMenuOpen(false)}>
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </Link>
        ))}
        <div style={{ marginTop: 16 }}>
          <a
            href="https://www.roblox.com/games/130342654546662/Sambung-Kata"
            target="_blank" rel="noopener noreferrer"
            className="sk-play-btn"
            style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}
            onClick={() => setMenuOpen(false)}
          >
            🎮 Main Sambung Kata di Roblox
          </a>
        </div>
      </div>
    </>
  )
}
