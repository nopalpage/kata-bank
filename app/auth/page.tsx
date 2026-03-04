// app/auth/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      setMessage({ type: 'error', text: 'Login gagal. Coba lagi.' })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          emailRedirectTo: 'https://kata-bank.vercel.app/auth/callback'
        }
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Cek email kamu untuk konfirmasi akun!' })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: 'error', text: 'Email atau password salah.' })
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://kata-bank.vercel.app/auth/callback' }
    })
  }

  async function handlePasskey() {
    setLoading(true)
    setMessage(null)

    // Fallback since signInWithPasskey isn't natively supported by this Supabase version
    setMessage({ type: 'error', text: 'Fitur Passkey belum dikonfigurasi pada server Supabase.' })
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: 'var(--bg)'
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-playfair), serif', fontSize: '2rem',
        fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px'
      }}>
        Lexi<span style={{ color: 'var(--accent)' }}>ca</span>
      </div>
      <div style={{ color: 'var(--text3)', fontSize: '0.85rem', marginBottom: '32px' }}>
        Penyimpan kata & kalimat personal
      </div>

      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px'
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'var(--surface2)', borderRadius: '8px', padding: '4px'
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setMessage(null) }} style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: 500, transition: 'all 0.15s',
              background: mode === m ? 'var(--surface3)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text3)',
            }}>
              {m === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'signup' && (
            <input
              type="text" placeholder="Nama" value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle} required
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle} required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle} required minLength={6}
          />

          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem',
              background: message.type === 'error' ? 'rgba(224,108,117,0.1)' : 'rgba(152,195,121,0.1)',
              color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              border: `1px solid ${message.type === 'error' ? 'rgba(224,108,117,0.3)' : 'rgba(152,195,121,0.3)'}`
            }}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '11px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#0e0e11',
            fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 600,
            fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'all 0.15s'
          }}>
            {loading ? '...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>

        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>atau</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleGoogle} disabled={loading} style={oauthButtonStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <button onClick={handlePasskey} disabled={loading} style={oauthButtonStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Passkey
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--surface2)',
  color: 'var(--text)', fontFamily: 'var(--font-dm-sans), sans-serif',
  fontSize: '0.88rem', outline: 'none', width: '100%',
  transition: 'border-color 0.15s',
}
const oauthButtonStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--surface2)',
  color: 'var(--text2)', fontFamily: 'var(--font-dm-sans), sans-serif',
  fontSize: '0.88rem', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: '10px',
  transition: 'border-color 0.15s, background 0.15s'
}
