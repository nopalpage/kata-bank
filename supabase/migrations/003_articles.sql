-- supabase/migrations/003_articles.sql
-- Tabel artikel untuk website Sambung Kata
-- Jalankan di: Supabase Dashboard → SQL Editor

-- ══════════════════════════════════════════════════════════════════════════════
-- TABEL: articles
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.articles (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name  TEXT        DEFAULT 'Tim SambungKata',
  title        TEXT        NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  slug         TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  excerpt      TEXT        CHECK (length(excerpt) <= 400),
  content      TEXT        NOT NULL CHECK (length(content) >= 10),
  category     TEXT        NOT NULL DEFAULT 'strategi'
                           CHECK (category IN ('strategi','kosakata','tips-trik','panduan','edukasi','berita')),
  tags         TEXT[]      DEFAULT '{}' NOT NULL,
  cover_emoji  TEXT        DEFAULT '📝' CHECK (length(cover_emoji) <= 10),
  is_published BOOLEAN     DEFAULT false NOT NULL,
  is_featured  BOOLEAN     DEFAULT false NOT NULL,
  view_count   INT         DEFAULT 0 NOT NULL CHECK (view_count >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Siapa saja bisa baca artikel yang sudah dipublikasi
CREATE POLICY "Public can read published articles"
  ON public.articles FOR SELECT
  USING (is_published = true);

-- Admin (authenticated) bisa baca semua artikel miliknya
CREATE POLICY "Admins can read own articles"
  ON public.articles FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Admin bisa buat artikel
CREATE POLICY "Admins can create articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Admin bisa update artikel miliknya
CREATE POLICY "Admins can update own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Admin bisa hapus artikel miliknya
CREATE POLICY "Admins can delete own articles"
  ON public.articles FOR DELETE
  USING (auth.uid() = author_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS articles_slug_idx
  ON public.articles(slug);

CREATE INDEX IF NOT EXISTS articles_published_idx
  ON public.articles(is_published, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_category_idx
  ON public.articles(category, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS articles_featured_idx
  ON public.articles(is_featured, is_published)
  WHERE is_featured = true AND is_published = true;

CREATE INDEX IF NOT EXISTS articles_views_idx
  ON public.articles(view_count DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS articles_tags_gin_idx
  ON public.articles USING GIN(tags);

CREATE INDEX IF NOT EXISTS articles_author_idx
  ON public.articles(author_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Increment view count (atomic, no auth required)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_view(article_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.articles
  SET view_count = view_count + 1
  WHERE id = article_id AND is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Artikel contoh
-- ══════════════════════════════════════════════════════════════════════════════

-- CATATAN: Ganti 'YOUR-ADMIN-UUID' dengan UUID admin Anda dari auth.users
-- Untuk mengambil UUID: SELECT id FROM auth.users LIMIT 1;

-- Artikel 1: Panduan Pemula
INSERT INTO public.articles (title, slug, excerpt, content, category, tags, cover_emoji, is_published, is_featured, view_count, author_name)
VALUES (
  'Panduan Lengkap Bermain Sambung Kata untuk Pemula',
  'panduan-lengkap-pemula',
  'Baru pertama kali bermain Sambung Kata di Roblox? Artikel ini membahas semua yang perlu kamu tahu dari awal hingga bisa menang.',
  E'## Apa itu Sambung Kata?\n\nSambung Kata adalah permainan kata berbahasa Indonesia yang populer di platform Roblox. Setiap pemain harus menyebutkan kata yang dimulai dari **huruf terakhir kata sebelumnya**.\n\n**Contoh:**\n- MAKAN → NASI → IKAN → NILA → ...\n\n## Aturan Dasar\n\nAda beberapa aturan yang perlu kamu pahami sebelum mulai bermain:\n\n- Kata harus ada dalam kamus KBBI (Kamus Besar Bahasa Indonesia)\n- Kata tidak boleh diulang dalam satu putaran\n- Harus dimulai dari huruf terakhir kata sebelumnya\n- Ada batas waktu untuk setiap giliran\n\n## Cara Memulai\n\nUntuk mulai bermain, kamu perlu:\n\n1. Buka Roblox dan cari "Sambung Kata"\n2. Klik tombol Join untuk bergabung\n3. Tunggu sampai ronde dimulai\n4. Ketik kata saat giliran kamu tiba\n\n## Tips untuk Pemula\n\nBerikut beberapa tips sederhana untuk pemain baru:\n\n- **Pelajari kata pendek** yang dimulai dari huruf umum (A, I, U, E, O)\n- **Hindari kata yang berakhiran X, Z, Q** karena susah disambung\n- **Simpan kata berakhiran A** sebagai amunisi karena banyak kata Indonesia berawalan A\n- Baca daftar kata-kata KBBI sebanyak mungkin\n\n## Mulai Berlatih Sekarang!\n\nJangan ragu untuk langsung mencoba. Semakin sering bermain, semakin banyak kosakata yang kamu kuasai. Kunjungi artikel-artikel lain di website ini untuk belajar lebih banyak strategi!',
  'panduan', ARRAY['pemula', 'panduan', 'aturan', 'kbbi'], '🗺️', true, false, 0, 'Tim SambungKata'
);

-- Artikel 2: Strategi
INSERT INTO public.articles (title, slug, excerpt, content, category, tags, cover_emoji, is_published, is_featured, view_count, author_name)
VALUES (
  'Strategi Ampuh Memenangkan Sambung Kata: Panduan Lengkap',
  'strategi-menang-sambung-kata',
  'Pelajari 7 strategi terbukti yang digunakan pemain veteran untuk selalu menang di Sambung Kata Roblox. Dari teknik menyerang hingga bertahan!',
  E'## Mengapa Strategi Itu Penting?\n\nSambung Kata bukan sekadar soal kosakata. Pemain yang menguasai **strategi permainan** jauh lebih unggul dibanding yang hanya mengandalkan hapalan kata.\n\n## 7 Strategi Kunci\n\n### 1. Gunakan Kata Berakhiran Huruf Sulit\n\nHuruf yang paling susah disambung adalah **X, Q, Z, Y**. Jika kamu punya kesempatan, gunakan kata yang berakhiran huruf ini untuk menjebak lawan.\n\n**Contoh kata berakhiran Z:**\n- SENAZ\n- CERMAT → *cari kata berakhiran T dulu*\n\n### 2. Simpan "Kata Andalan"\n\nSiapkan beberapa kata yang selalu kamu ingat untuk huruf-huruf sulit. Misalnya:\n- Untuk huruf **I**: IKAN, IKAT, IRAMA, INDUK\n- Untuk huruf **U**: ULAT, USAHA, UANG, UDARA\n\n### 3. Teknik "Memaksa"\n\nCoba paksa lawan ke kata-kata berakhiran huruf sulit dengan cara:\n- Kalau giliran kamu dapat huruf E, cari kata yang berakhiran Z atau Q\n- Contoh: kata berawalan E yang berakhiran Z = *cukup sulit, itulah yang ingin kita lakukan ke lawan!*\n\n### 4. Kuasai Awalan "ME-, PE-, BER-"\n\nBanyak kata Indonesia bisa dibentuk dengan awalan ini. Ini membantu saat kamu kesulitan mencari kata untuk huruf tertentu.\n\n**Contoh:**\n- M: MAKAN, MERAH, MINUM, MUSIK\n- P: PAGI, PERGI, PUKUL, PASAR\n- B: BUKU, BERMAIN, BESAR, BERANI\n\n### 5. Manfaatkan Kata Serapan\n\nKata-kata serapan dari bahasa asing yang sudah masuk KBBI sangat berguna!\n\n**Contoh:**\n- TEKNOLOGI → berakhiran I\n- ENERGI → berakhiran I  \n- ORGANISASI → berakhiran I\n\n### 6. Hafal Kata-Kata Langka KBBI\n\nPemain pro sering menggunakan kata-kata yang jarang diketahui orang. Pelajari:\n- Kata-kata bidang pertanian dan alam\n- Kata-kata daerah yang sudah masuk KBBI\n- Istilah ilmiah dalam Bahasa Indonesia\n\n### 7. Manajemen Waktu\n\nJangan panik saat waktu hampir habis! Siapkan selalu 2-3 kata "cadangan" di kepala kamu.\n\n## Latihan Setiap Hari\n\nSemakin banyak kamu bermain, semakin berkembang kosakata kamu. Targetkan minimal 30 menit bermain setiap hari sambil aktif mencatat kata-kata baru yang kamu temui.',
  'strategi', ARRAY['strategi', 'menang', 'teknik', 'pro'], '⚔️', true, true, 0, 'Tim SambungKata'
);

-- Artikel 3: Kosakata
INSERT INTO public.articles (title, slug, excerpt, content, category, tags, cover_emoji, is_published, is_featured, view_count, author_name)
VALUES (
  '100 Kata Berakhiran A yang Wajib Dihafal',
  '100-kata-berakhiran-a',
  'Huruf A adalah huruf paling sering muncul di akhir kata dalam bahasa Indonesia. Kuasai 100 kata terbaik berakhiran A untuk keunggulan di Sambung Kata!',
  E'## Mengapa Kata Berakhiran A Itu Penting?\n\nHuruf **A** adalah salah satu huruf yang paling sering muncul di awal kata bahasa Indonesia. Artinya, kalau kamu bisa konsisten memberikan kata berakhiran A, kamu tidak akan kehabisan pilihan — tapi lawan bisa saja kesulitan merespons cepat!\n\n## Daftar Kata Berakhiran A (Tersortir per Kategori)\n\n### Kata Benda Umum\n- **BOLA** — alat olahraga bulat\n- **MEJA** — furnitur untuk menaruh barang\n- **BUKA** — aksi membuka\n- **KACA** — bahan transparan\n- **NADA** — suara musik\n- **RODA** — bagian kendaraan yang berputar\n- **TANDA** — petunjuk atau simbol\n- **WARNA** — corak atau pigmen\n- **KATA** — satuan bahasa\n- **CARA** — metode atau teknik\n\n### Kata Kerja\n- **CINTA** — rasa kasih yang dalam\n- **BACA** — aktivitas membaca\n- **MINTA** — memohon atau meminta\n- **INTA** (singkatan bermakna)\n- **LUPA** — tidak ingat\n- **SUKA** — merasa senang\n- **TANYA** — mengajukan pertanyaan\n- **JAGA** — menjaga atau merawat\n- **KERJA** — aktivitas bekerja\n- **RASA** — perasaan atau cita rasa\n\n### Kata Sifat\n- **LAMA** — sudah lama, tidak baru\n- **MUDA** — berusia muda\n- **BESAR** *(berakhiran R, jangan salah!)*\n- **BIASA** — normal, tidak spesial\n- **NYATA** — benar-benar ada\n- **LUAR BIASA** *(frasa)*\n- **RATA** — tidak bergelombang\n- **PEKA** — sensitif\n- **SURGA** — tempat kebaikan abadi\n- **DUKA** — kesedihan\n\n### Kata dari Alam\n- **RIMBA** — hutan lebat\n- **MEGA** — awan besar\n- **GEMA** — pantulan suara\n- **DELTA** — muara sungai\n- **FLORA** — dunia tumbuhan\n- **FAUNA** — dunia hewan\n- **LAVA** — magma yang mengalir\n- **ARENA** — tempat pertandingan\n- **ZONA** — wilayah tertentu\n- **BUANA** — alam semesta, dunia\n\n### Kata Serapan Berguna\n- **KAMERA** — alat foto\n- **DATA** — informasi\n- **AGENDA** — rencana kegiatan\n- **SKALA** — ukuran perbandingan\n- **TEMA** — pokok bahasan\n- **DRAMA** — pertunjukan teater\n- **OPERA** — pertunjukan musik\n- **MEDIA** — sarana penyampaian\n- **KURVA** — garis melengkung\n- **FOBIA** — ketakutan berlebihan\n\n## Tips Menghafalnya\n\nJangan coba hafal semuanya sekaligus! Pilih **10 kata per hari** dan praktikkan langsung dalam permainan. Otak lebih mudah mengingat kata yang pernah digunakan secara aktif.',
  'kosakata', ARRAY['kosakata', 'huruf-a', 'hafalan', 'daftar-kata'], '📚', true, false, 0, 'Tim SambungKata'
);

-- Artikel 4: Tips
INSERT INTO public.articles (title, slug, excerpt, content, category, tags, cover_emoji, is_published, is_featured, view_count, author_name)
VALUES (
  'Kata-Kata KBBI Langka yang Jarang Diketahui Pemain Lain',
  'kata-kbbi-langka-jarang-diketahui',
  'Gunakan kata-kata obscure dari KBBI ini untuk mengejutkan lawan. Kata-kata ini valid tapi jarang diketahui — senjata rahasia para pemain pro!',
  E'## Senjata Rahasia: Kata Langka KBBI\n\nKBBI (Kamus Besar Bahasa Indonesia) menyimpan ribuan kata yang tidak banyak orang tahu. Memahami kata-kata ini memberikan keunggulan besar dalam Sambung Kata!\n\n## Kata Langka Berdasarkan Huruf Awal\n\n### Huruf X (sangat langka!)\n- **XENON** — gas mulia dalam tabel periodik\n- **XILOFON** — alat musik pukul\n- **XILOSA** — jenis gula dari tanaman\n\n### Huruf Z\n- **ZAITUN** — pohon dan buahnya, sumber minyak\n- **ZAMRUD** — batu permata berwarna hijau\n- **ZENITH** — titik tertinggi\n- **ZEOLIT** — mineral aluminosilikat\n- **ZIGZAG** — gerakan berkelok-kelok\n\n### Huruf Y\n- **YODIUM** — unsur kimia untuk antiseptik\n- **YOGA** — teknik olahraga dari India\n- **YURISDIKSI** — kewenangan hukum\n\n### Kata Bidang Ilmu\n- **ABIOTIK** — faktor tak hidup dalam ekosistem\n- **BIOTIK** — faktor hidup dalam ekosistem\n- **EKOLOGI** — ilmu tentang lingkungan\n- **FONOLOGI** — ilmu bunyi bahasa\n- **MORFOLOGI** — ilmu bentuk kata\n- **SINTAKSIS** — ilmu susunan kalimat\n- **PRAGMATIK** — ilmu konteks berbahasa\n\n### Kata Daerah yang Masuk KBBI\n- **BECEK** — tanah berlumpur (Jawa)\n- **GENDU** — ngobrol santai (Jawa)\n- **REMPAH** — bumbu-bumbuan\n- **KUMUH** — kotor dan tidak tertata\n- **BALAI** — tempat berkumpul masyarakat\n- **BANJAR** — kelompok warga (Bali)\n\n### Kata Archaic (Lama)\n- **ARJUNA** — pahlawan pewayangan\n- **AMERTA** — air kehidupan abadi\n- **ANANDA** — kebahagiaan (Sansekerta)\n- **AKSARA** — huruf atau tulisan\n- **ANEKA** — bermacam-macam\n- **WAHANA** — kendaraan atau media\n\n## Cara Mempelajari Kata Langka\n\n1. **Baca artikel di KBBi daring** setiap hari selama 10 menit\n2. **Catat kata unik** yang kamu temukan saat membaca\n3. **Buat flashcard** dengan kata di satu sisi dan artinya di sisi lain\n4. **Gunakan dalam percakapan** sehari-hari agar tidak lupa\n\n> "Seorang pemain kata yang hebat adalah seorang pembaca yang rajin." — Prinsip para master Scrabble\n\n## Peringatan Penting\n\nPastikan semua kata yang kamu gunakan **valid di KBBI resmi**. Kata slang, singkatan, atau nama merek tidak diterima dalam permainan!',
  'tips-trik', ARRAY['kata-langka', 'kbbi', 'rahasia', 'tips-pro'], '💡', true, false, 0, 'Tim SambungKata'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- REALTIME (opsional)
-- ══════════════════════════════════════════════════════════════════════════════
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;
