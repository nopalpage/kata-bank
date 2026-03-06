// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Article } from '@/types'
import { formatDateShort, getCategoryName, getCategoryIcon, getCategoryColor } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  const list = (articles ?? []) as Article[]
  const published = list.filter(a => a.is_published)
  const drafts = list.filter(a => !a.is_published)
  const totalViews = list.reduce((s, a) => s + a.view_count, 0)

  const stats = [
    { label: 'Total Artikel', value: list.length, icon: '📝', color: '#FF6B35' },
    { label: 'Dipublikasi', value: published.length, icon: '✅', color: '#06D6A0' },
    { label: 'Draft', value: drafts.length, icon: '📄', color: '#FFD93D' },
    { label: 'Total Views', value: totalViews.toLocaleString('id-ID'), icon: '👁', color: '#4ECDC4' },
  ]

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'2rem', letterSpacing:'0.04em', marginBottom:8, color:'#F0F4FF' }}>
        DASHBOARD
      </h1>
      <p style={{ color:'rgba(157,171,194,0.8)', marginBottom:28, fontSize:'0.9rem' }}>
        Kelola semua artikel Sambung Kata dari sini.
      </p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, marginBottom:32 }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background:'rgba(17,24,39,0.8)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:14, padding:'18px 20px',
          }}>
            <div style={{ fontSize:'1.5rem', marginBottom:8 }}>{stat.icon}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'2rem', color:stat.color, lineHeight:1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize:'0.78rem', color:'rgba(90,106,130,0.9)', marginTop:4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Articles Table */}
      <div style={{ background:'rgba(17,24,39,0.8)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.2rem', letterSpacing:'0.04em', color:'#F0F4FF' }}>
            SEMUA ARTIKEL
          </div>
          <Link href="/admin/artikel/baru" style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(255,107,53,0.15)', color:'#FF6B35',
            padding:'6px 14px', borderRadius:8,
            fontSize:'0.82rem', fontWeight:700,
            border:'1px solid rgba(255,107,53,0.3)',
            textDecoration:'none',
          }}>
            ✍️ Buat Baru
          </Link>
        </div>

        {list.length === 0 ? (
          <div style={{ padding:'60px 24px', textAlign:'center', color:'rgba(157,171,194,0.6)' }}>
            <div style={{ fontSize:'2rem', marginBottom:12 }}>📝</div>
            <p>Belum ada artikel. Mulai tulis artikel pertama!</p>
            <Link href="/admin/artikel/baru" style={{
              display:'inline-block', marginTop:16,
              background:'#FF6B35', color:'#fff',
              padding:'10px 24px', borderRadius:10,
              fontWeight:700, fontSize:'0.9rem', textDecoration:'none',
            }}>
              + Tulis Artikel Pertama
            </Link>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {['Judul', 'Kategori', 'Status', 'Views', 'Tanggal', 'Aksi'].map(h => (
                    <th key={h} style={{
                      padding:'12px 16px', textAlign:'left',
                      fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'1px',
                      color:'rgba(90,106,130,0.9)', fontWeight:700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((article, i) => {
                  const catColor = getCategoryColor(article.category)
                  return (
                    <tr key={article.id} style={{
                      borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition:'background 0.15s',
                    }}>
                      <td style={{ padding:'12px 16px', maxWidth:280 }}>
                        <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#F0F4FF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {article.cover_emoji} {article.title}
                        </div>
                        {article.is_featured && (
                          <span style={{ fontSize:'0.65rem', background:'rgba(255,107,53,0.15)', color:'#FF6B35', padding:'1px 6px', borderRadius:99, marginTop:3, display:'inline-block' }}>⭐ Unggulan</span>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          background:`${catColor}18`, color:catColor,
                          padding:'2px 9px', borderRadius:99,
                          fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap',
                        }}>
                          {getCategoryIcon(article.category)} {getCategoryName(article.category)}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          background: article.is_published ? 'rgba(6,214,160,0.12)' : 'rgba(255,211,61,0.12)',
                          color: article.is_published ? '#06D6A0' : '#FFD93D',
                          padding:'2px 9px', borderRadius:99,
                          fontSize:'0.72rem', fontWeight:700,
                        }}>
                          {article.is_published ? '✅ Publik' : '📄 Draft'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'0.85rem', color:'rgba(157,171,194,0.8)', fontFamily:"'JetBrains Mono', monospace" }}>
                        {article.view_count.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'0.8rem', color:'rgba(90,106,130,0.9)', whiteSpace:'nowrap' }}>
                        {formatDateShort(article.created_at)}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <Link href={`/artikel/${article.slug}`} target="_blank"
                            style={{ padding:'5px 10px', borderRadius:7, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', fontSize:'0.78rem', color:'rgba(157,171,194,0.8)', textDecoration:'none' }}>
                            👁
                          </Link>
                          <Link href={`/admin/artikel/${article.id}/edit`}
                            style={{ padding:'5px 10px', borderRadius:7, background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.2)', fontSize:'0.78rem', color:'#FF6B35', textDecoration:'none', fontWeight:600 }}>
                            ✏️ Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
