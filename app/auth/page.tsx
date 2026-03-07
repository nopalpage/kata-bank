'use client'
// app/auth/page.tsx — Admin login only (no public registration)
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setMessage({ type: 'error', text: 'Sesi berakhir. Silakan masuk kembali.' })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ type: 'error', text: 'Email atau password salah.' })
    } else {
      router.push('/admin')
      router.refresh()
    }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    padding: '12px 16px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#F0F4FF', fontFamily: "'Nunito', sans-serif",
    fontSize: '0.93rem', outline: 'none', width: '100%',
    transition: 'border-color 0.2s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap');
        body { margin: 0; background: #080D1A; font-family: 'Nunito', sans-serif; }
        input:focus { border-color: #FF6B35 !important; }
        .auth-btn {
          width: 100%; padding: 13px; border-radius: 10px;
          border: none; background: #FF6B35; color: #fff;
          font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 6px 24px rgba(255,107,53,0.4);
        }
        .auth-btn:hover:not(:disabled) { background: #ff7d4d; box-shadow: 0 8px 32px rgba(255,107,53,0.55); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Background blobs */}
        <div style={{
          position: 'fixed', top: '20%', left: '10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(17,24,39,0.8)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20, padding: 36,
          backdropFilter: 'blur(12px)',
          position: 'relative', zIndex: 1,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem', letterSpacing: '0.06em', color: '#F0F4FF',
            }}>
              <span style={{ color: '#FF6B35' }}>⛓</span> SambungKata
            </div>
          </div>

          {/* Admin label */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{
              background: 'rgba(255,107,53,0.12)', color: '#FF6B35',
              padding: '4px 14px', borderRadius: 99, fontSize: '0.72rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              border: '1px solid rgba(255,107,53,0.25)',
            }}>
              🔐 Admin Panel
            </span>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(157,171,194,0.8)', fontSize: '0.87rem', marginBottom: 24 }}>
            Masuk untuk mengelola artikel
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email" placeholder="Email admin"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inp} required autoComplete="email"
            />
            <input
              type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={inp} required autoComplete="current-password"
            />

            {message && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem',
                background: message.type === 'error' ? 'rgba(224,108,117,0.12)' : 'rgba(6,214,160,0.12)',
                color: message.type === 'error' ? '#E06C75' : '#06D6A0',
                border: `1px solid ${message.type === 'error' ? 'rgba(224,108,117,0.3)' : 'rgba(6,214,160,0.3)'}`,
              }}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? '⏳ Memuat...' : '🔓 Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(90,106,130,0.8)', marginTop: 20 }}>
            Halaman ini hanya untuk admin. Publik tidak dapat mendaftar.
          </p>

          {/* Back to site */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/" style={{ fontSize: '0.82rem', color: 'rgba(157,171,194,0.6)', textDecoration: 'none' }}>
              ← Kembali ke website
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
