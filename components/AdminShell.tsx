'use client'
// components/AdminShell.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  user: { id: string; email: string; name: string }
  children: React.ReactNode
}

export default function AdminShell({ user, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/artikel/baru', label: 'Artikel Baru', icon: '✍️' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap');
        body { margin:0; background:#080D1A; font-family:'Nunito',sans-serif; color:#F0F4FF; }
        .adm-shell { display:flex; min-height:100vh; }
        .adm-sidebar {
          width: 240px; flex-shrink:0;
          background: rgba(13,21,37,0.95);
          border-right: 1px solid rgba(255,255,255,0.07);
          display:flex; flex-direction:column;
          position:sticky; top:0; height:100vh;
          overflow-y:auto;
        }
        .adm-logo {
          padding:24px 20px;
          font-family:'Bebas Neue',sans-serif;
          font-size:1.4rem; letter-spacing:0.06em;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          color:#F0F4FF;
        }
        .adm-logo span { color:#FF6B35; }
        .adm-nav { padding:16px 12px; flex:1; display:flex; flex-direction:column; gap:4px; }
        .adm-nav-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px;
          font-size:0.88rem; font-weight:600;
          color:rgba(157,171,194,0.8);
          transition:all 0.2s; border:1px solid transparent;
          text-decoration:none;
        }
        .adm-nav-item:hover { background:rgba(255,255,255,0.05); color:#F0F4FF; }
        .adm-nav-item.active { background:rgba(255,107,53,0.12); color:#FF6B35; border-color:rgba(255,107,53,0.2); }
        .adm-footer {
          padding:16px 12px;
          border-top:1px solid rgba(255,255,255,0.07);
        }
        .adm-user {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px;
          margin-bottom:8px;
        }
        .adm-avatar {
          width:32px; height:32px; border-radius:50%;
          background:linear-gradient(135deg,#FF6B35,#9B5DE5);
          display:flex; align-items:center; justify-content:center;
          font-size:0.8rem; font-weight:700; color:#fff; flex-shrink:0;
        }
        .adm-signout {
          display:flex; align-items:center; gap:8px;
          padding:8px 12px; border-radius:8px;
          font-size:0.83rem; font-weight:600;
          color:rgba(224,108,117,0.8);
          background:none; border:none; cursor:pointer;
          width:100%; transition:all 0.2s;
        }
        .adm-signout:hover { background:rgba(224,108,117,0.1); color:#E06C75; }
        .adm-main { flex:1; min-width:0; }
        .adm-topbar {
          padding:14px 28px;
          border-bottom:1px solid rgba(255,255,255,0.07);
          display:flex; align-items:center; justify-content:space-between;
          background:rgba(8,13,26,0.8); backdrop-filter:blur(12px);
          position:sticky; top:0; z-index:100;
        }
        .adm-content { padding:28px; }
        @media (max-width:768px) {
          .adm-sidebar { display:none; }
          .adm-content { padding:16px; }
        }
      `}</style>
      <div className="adm-shell">
        <aside className="adm-sidebar">
          <div className="adm-logo">
            <Link href="/" style={{ textDecoration:'none', color:'inherit' }}>
              <span>⛓</span> Sambung<span>Kata</span>
            </Link>
          </div>
          <nav className="adm-nav">
            <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'1.5px', color:'rgba(90,106,130,0.7)', fontWeight:700, padding:'8px 4px 4px' }}>
              Menu
            </div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`adm-nav-item${pathname === item.href ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <div style={{ marginTop: 12, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'1.5px', color:'rgba(90,106,130,0.7)', fontWeight:700, padding:'8px 4px 4px' }}>
              Website
            </div>
            <Link href="/" className="adm-nav-item" target="_blank" rel="noopener noreferrer">
              <span>🌐</span> Lihat Website
            </Link>
          </nav>
          <div className="adm-footer">
            <div className="adm-user">
              <div className="adm-avatar">{user.name[0].toUpperCase()}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:'0.83rem', fontWeight:700, color:'#F0F4FF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize:'0.7rem', color:'rgba(90,106,130,0.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button className="adm-signout" onClick={signOut}>
              🚪 Keluar
            </button>
          </div>
        </aside>
        <div className="adm-main">
          <div className="adm-topbar">
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.2rem', letterSpacing:'0.04em' }}>
              Admin Panel
            </div>
            <Link
              href="/admin/artikel/baru"
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                background:'#FF6B35', color:'#fff',
                padding:'7px 16px', borderRadius:8,
                fontSize:'0.83rem', fontWeight:700,
                textDecoration:'none',
              }}
            >
              ✍️ Artikel Baru
            </Link>
          </div>
          <div className="adm-content">{children}</div>
        </div>
      </div>
    </>
  )
}
