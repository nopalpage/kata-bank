# ⛓ SambungKata — Website Artikel & Strategi Game Roblox

Website artikel lengkap untuk permainan **Sambung Kata** di Roblox. Berisi strategi, kosakata KBBI, tips & trik, dan panduan untuk pemain dari semua level.

🎮 **Link Game:** https://www.roblox.com/games/130342654546662/Sambung-Kata

---

## ✨ Fitur Utama

### 🌐 Website Publik
- **Beranda** — Artikel unggulan, kategori, artikel terbaru, artikel populer
- **Halaman Artikel** — Konten lengkap dengan Markdown rendering
- **Halaman Kategori** — Filter artikel per topik
- **Desain Responsif** — Mobile-friendly dengan estetika gaming magazine

### 🔐 Admin Panel (Login Diperlukan)
- **Dashboard** — Statistik artikel (total, publik, draft, views)
- **Buat Artikel Baru** — Editor lengkap dengan preview Markdown
- **Edit Artikel** — Update konten yang sudah ada
- **Hapus Artikel** — Dengan konfirmasi
- **Publikasi / Draft** — Kontrol visibilitas artikel
- **Artikel Unggulan** — Tandai artikel penting di beranda

> ⚠️ **Hanya admin yang bisa login.** Tidak ada halaman registrasi publik.

---

## 🗂️ Kategori Artikel

| Kategori | Deskripsi |
|----------|-----------|
| ⚔️ Strategi & Taktik | Panduan memenangkan permainan |
| 📚 Kosakata | Koleksi kata-kata penting |
| 💡 Tips & Trik | Tips rahasia pemain veteran |
| 🗺️ Panduan Pemula | Dari nol hingga mahir |
| 🎓 Edukasi Bahasa | Belajar Bahasa Indonesia sambil bermain |
| 📰 Berita & Update | Informasi terbaru tentang game |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Auth)
- **Styling:** CSS-in-JS + Global CSS
- **Font:** Bebas Neue (Display) + Nunito (Body)
- **Deployment:** Vercel

---

## 🚀 Setup & Instalasi

### 1. Clone & Install

```bash
git clone <repo-url>
cd sambung-kata
npm install
```

### 2. Konfigurasi Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Copy file environment:
   ```bash
   cp .env.example .env.local
   ```
3. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Setup Database

Jalankan migrasi di **Supabase Dashboard → SQL Editor**:

```sql
-- Jalankan file ini:
supabase/migrations/003_articles.sql
```

Script ini akan:
- Membuat tabel `articles` dengan RLS
- Menambahkan indexes untuk performa
- Membuat fungsi `increment_view`
- Memasukkan 4 artikel contoh

### 4. Buat Admin

Di Supabase Dashboard → **Authentication → Users → Invite User**:
- Masukkan email admin
- Admin akan menerima email undangan

Atau buat via SQL:
```sql
-- Tidak disarankan untuk produksi
-- Gunakan Supabase Dashboard untuk keamanan
```

### 5. Jalankan Development

```bash
npm run dev
```

Buka: http://localhost:3000

---

## 📁 Struktur Proyek

```
sambung-kata/
├── app/
│   ├── page.tsx              # Beranda
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── auth/
│   │   └── page.tsx          # Admin login
│   ├── artikel/
│   │   └── [slug]/page.tsx   # Halaman artikel
│   ├── kategori/
│   │   └── [slug]/page.tsx   # Halaman kategori
│   ├── admin/
│   │   ├── layout.tsx        # Admin layout (protected)
│   │   ├── page.tsx          # Dashboard admin
│   │   └── artikel/
│   │       ├── baru/page.tsx # Buat artikel baru
│   │       └── [id]/edit/    # Edit artikel
│   └── api/
│       └── articles/         # REST API routes
├── components/
│   ├── Header.tsx            # Header navigasi
│   ├── Footer.tsx            # Footer
│   ├── ArticleCard.tsx       # Kartu artikel
│   ├── ArticleEditor.tsx     # Editor artikel admin
│   └── AdminShell.tsx        # Shell admin dengan sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   └── utils.ts              # Utilities & konstanta
├── types/
│   └── index.ts              # TypeScript types
└── supabase/
    └── migrations/
        └── 003_articles.sql  # Database schema
```

---

## ✍️ Panduan Menulis Artikel

### Markdown yang Didukung

```markdown
## Judul H2
### Sub-judul H3

**teks tebal**
*teks miring*
`kode inline`

> Kutipan penting

- Item list 1
- Item list 2

---  (garis horizontal)
```

### Tips Konten

- Tulis minimal **300 kata** per artikel untuk kualitas SEO
- Gunakan **kata kunci** yang relevan dengan Sambung Kata
- Sertakan **contoh kata-kata konkret** dari KBBI
- Akhiri dengan **call-to-action** ke game Roblox

---

## 🔒 Keamanan

- Row Level Security (RLS) aktif di semua tabel
- Hanya authenticated user yang bisa CRUD artikel
- Tidak ada endpoint registrasi publik
- View count di-increment via database function (tidak bisa dimanipulasi)

---

## 📊 Database Schema

### Tabel `articles`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | UUID | Primary key |
| author_id | UUID | FK ke auth.users |
| author_name | TEXT | Nama penulis tampil |
| title | TEXT | Judul artikel |
| slug | TEXT | URL-friendly identifier |
| excerpt | TEXT | Ringkasan (maks 400 char) |
| content | TEXT | Konten Markdown |
| category | TEXT | Salah satu dari 6 kategori |
| tags | TEXT[] | Array tag |
| cover_emoji | TEXT | Emoji cover |
| is_published | BOOL | Visibilitas publik |
| is_featured | BOOL | Ditampilkan unggulan |
| view_count | INT | Jumlah views |
| created_at | TIMESTAMPTZ | Waktu dibuat |
| updated_at | TIMESTAMPTZ | Waktu diperbarui |

---

## 🚢 Deploy ke Vercel

1. Push ke GitHub
2. Connect di [vercel.com](https://vercel.com)
3. Tambahkan Environment Variables di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

---

## 📝 Lisensi

MIT — Bebas digunakan dan dimodifikasi.
