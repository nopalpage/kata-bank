# Lexica — Penyimpan Kata & Kalimat

Aplikasi personal yang aman dan cepat untuk menyimpan kata, kalimat, dan penjelasan — dibangun dengan **Next.js 14**, **Supabase**, dan di-deploy ke **Vercel**.

---

## ✨ Fitur

| Fitur | Keterangan |
|-------|------------|
| 🔐 Auth | Email/password + Google OAuth via Supabase |
| ☁️ Cloud Sync | Supabase Postgres + Row Level Security |
| ⚡ Optimistic UI | Update langsung tanpa menunggu server |
| 🔄 Realtime | Sinkron otomatis antar tab/perangkat |
| ⭐ Favorit | Tandai & filter entri favorit |
| 🔍 Smart Search | Cari awalan / tengah / akhiran kata (debounced) |
| 🏷️ Tags | Organisasi dengan tag + filter klik |
| 📊 Sort | Terbaru, terlama, A→Z, Z→A |
| 📋 Copy | Salin konten ke clipboard |
| 📦 Export | Download data ke JSON / CSV |
| ⌨️ Shortcuts | `Ctrl+Enter` simpan · `Esc` tutup modal |

---

## 🛡️ Keamanan

| Layer | Implementasi |
|-------|-------------|
| **Database RLS** | Setiap user hanya bisa akses data miliknya, enforced di Postgres |
| **DB Constraints** | CHECK constraints untuk tipe, panjang konten, jumlah tag |
| **Input Validation** | Validasi terstruktur di API routes (panjang, tipe, format) |
| **UUID Validation** | Regex validation sebelum query DB (cegah path injection) |
| **Rate Limiting** | Sliding window: 60 req/mnt umum, 30 req/mnt write, 10/15mnt auth |
| **Content Security Policy** | Whitelist ketat di semua response headers |
| **HSTS** | Strict Transport Security 2 tahun di production |
| **Cookie Auth** | JWT di HttpOnly cookie — tidak bisa diakses JavaScript |
| **No Secrets on Client** | Service role key hanya di server, tidak pernah ke browser |

---

## ⚡ Optimasi Performa

### Server
| Teknik | Detail |
|--------|--------|
| **SSR Initial Data** | Data di-fetch di Server Component → no client waterfall |
| **Select Columns** | Hanya ambil kolom yang dibutuhkan, bukan `SELECT *` |
| **Cursor Pagination** | Efficient offset-free pagination dengan cursor |
| **GIN Indexes** | Array (tags) + Full-text search indexes di Postgres |
| **Edge Middleware** | Auth + rate limit berjalan di Vercel Edge (bukan Serverless) |
| **Static Asset Cache** | `immutable` cache 1 tahun untuk `/_next/static/` |
| **Package Optimization** | `optimizePackageImports` untuk Supabase SDK |

### Client
| Teknik | Detail |
|--------|--------|
| **useMemo** | Filtered list, counts, tags hanya dihitung ulang saat data berubah |
| **useCallback** | Semua event handlers di-memoize untuk cegah re-render |
| **React.memo** | `EntryCard` tidak re-render jika props tidak berubah |
| **Debounce Search** | 150ms debounce — filter tidak jalan tiap keystroke |
| **Singleton Supabase** | Client dibuat sekali via `useMemo`, tidak tiap render |
| **AbortController** | Request in-flight dibatalkan saat component unmount |
| **Retry + Backoff** | Auto-retry dengan exponential backoff + jitter |
| **Optimistic UI** | State update lokal langsung, server sync di background |
| **contain: layout style** | CSS containment di cards — browser paint optimization |
| **Reduced Motion** | `prefers-reduced-motion` untuk aksesibilitas |

---

## 🚀 Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd lexica
npm install
```

### 2. Buat Supabase Project

1. [app.supabase.com](https://app.supabase.com) → **New Project**
2. Salin **Project URL** dan **Anon Key** dari Settings → API

### 3. Jalankan Migration

Di **Supabase → SQL Editor**, paste dan jalankan:
```
supabase/migrations/001_init.sql
```

### 4. Konfigurasi Environment

```bash
cp .env.example .env.local
# Edit .env.local dengan nilai Supabase kamu
```

### 5. Google OAuth (opsional)

Di **Supabase → Authentication → Providers → Google**:
- Aktifkan Google, masukkan Client ID & Secret
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 6. Run Development

```bash
npm run dev
# → http://localhost:3000
```

---

## 🌐 Deploy ke Vercel

```bash
# Via CLI
npm i -g vercel && vercel

# Atau: GitHub → vercel.com → New Project → Import
```

Tambahkan Environment Variables di **Vercel → Project → Settings → Env**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Setelah deploy, update di **Supabase → Auth → URL Configuration**:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## 🏗️ Arsitektur

```
Vercel Edge Network
├── middleware.ts          ← Auth guard + Rate limiting (Edge Runtime)
├── app/page.tsx           ← Server Component, SSR initial data
├── app/api/entries/       ← REST API (Node.js Runtime)
│   └── [id]/
└── components/LexicaApp   ← Client Component (React)
         │
         ▼ HTTPS + WSS
Supabase
├── Auth (JWT cookies)
├── Postgres (entries table + RLS + indexes)
└── Realtime (WebSocket subscriptions)
```

---

## 📁 Struktur

```
lexica/
├── app/
│   ├── api/entries/          # REST API — GET, POST, PATCH, DELETE
│   │   └── [id]/
│   ├── auth/                 # Login/signup
│   │   └── callback/         # OAuth callback
│   ├── layout.tsx
│   ├── page.tsx              # Server Component + SSR data
│   └── globals.css
├── components/
│   └── LexicaApp.tsx         # Main UI
├── hooks/
│   └── useDebounce.ts        # Debounce hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client (singleton)
│   │   └── server.ts         # Server client (cookies)
│   ├── validation.ts         # Input validation + limits
│   ├── rate-limit.ts         # Sliding window rate limiter
│   └── fetch-with-retry.ts   # Retry + backoff
├── supabase/
│   └── migrations/001_init.sql
├── types/index.ts
├── middleware.ts             # Edge: auth + rate limit
└── next.config.ts            # CSP + security headers
```
