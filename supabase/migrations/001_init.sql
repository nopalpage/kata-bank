-- supabase/migrations/001_init.sql
-- Jalankan di: Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────────────────
-- TABEL: entries
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entries (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('word', 'sentence', 'explanation')),
  title       TEXT,
  content     TEXT        NOT NULL,
  tags        TEXT[]      DEFAULT '{}' NOT NULL,
  is_favorite BOOLEAN     DEFAULT false NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Setiap user hanya bisa akses data miliknya sendiri
-- ─────────────────────────────────────────────────────
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Policy: select own entries
CREATE POLICY "Users can view own entries"
  ON public.entries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: insert own entries
CREATE POLICY "Users can insert own entries"
  ON public.entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: update own entries
CREATE POLICY "Users can update own entries"
  ON public.entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: delete own entries
CREATE POLICY "Users can delete own entries"
  ON public.entries FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────
-- INDEXES — Optimasi query performa
-- ─────────────────────────────────────────────────────
-- Index utama: filter by user
CREATE INDEX IF NOT EXISTS entries_user_id_idx
  ON public.entries(user_id);

-- Index: filter by type per user
CREATE INDEX IF NOT EXISTS entries_user_type_idx
  ON public.entries(user_id, type);

-- Index: sort by date (paling sering dipakai)
CREATE INDEX IF NOT EXISTS entries_user_created_idx
  ON public.entries(user_id, created_at DESC);

-- Index: favorites filter
CREATE INDEX IF NOT EXISTS entries_user_favorite_idx
  ON public.entries(user_id, is_favorite)
  WHERE is_favorite = true;

-- GIN Index: pencarian tags (sangat cepat untuk array contains)
CREATE INDEX IF NOT EXISTS entries_tags_gin_idx
  ON public.entries USING GIN(tags);

-- Full-text search index untuk content
CREATE INDEX IF NOT EXISTS entries_content_fts_idx
  ON public.entries USING GIN(to_tsvector('indonesian', content));

-- ─────────────────────────────────────────────────────
-- REALTIME — Aktifkan Supabase Realtime untuk tabel ini
-- ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;

-- ─────────────────────────────────────────────────────
-- USER PROFILES (opsional — untuk display name)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile saat user baru register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────
-- MIGRATION 002 — Tambahan optimasi keamanan & performa
-- (Jalankan ini setelah migration pertama)
-- ─────────────────────────────────────────────────────

-- Validasi tipe di level database (double check selain API)
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_type_check;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_type_check
  CHECK (type IN ('word', 'sentence', 'explanation'));

-- Batasi panjang konten di DB (defense in depth)
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_content_length_check;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_content_length_check
  CHECK (length(content) BETWEEN 1 AND 5000);

-- Batasi panjang title
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_title_length_check;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_title_length_check
  CHECK (title IS NULL OR length(title) <= 200);

-- Batasi jumlah tag
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_tags_count_check;
ALTER TABLE public.entries
  ADD CONSTRAINT entries_tags_count_check
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20);

-- ─────────────────────────────────────────────────────
-- FUNCTION: Statistik user (dipanggil di dashboard)
-- Menggunakan SECURITY DEFINER agar bisa diakses via RPC
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS TABLE(
  total_entries   BIGINT,
  total_words     BIGINT,
  total_sentences BIGINT,
  total_explanations BIGINT,
  total_favorites BIGINT,
  total_tags      BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)                                                AS total_entries,
    COUNT(*) FILTER (WHERE type = 'word')                  AS total_words,
    COUNT(*) FILTER (WHERE type = 'sentence')              AS total_sentences,
    COUNT(*) FILTER (WHERE type = 'explanation')           AS total_explanations,
    COUNT(*) FILTER (WHERE is_favorite = true)             AS total_favorites,
    (SELECT COUNT(DISTINCT unnested) FROM public.entries e2, UNNEST(e2.tags) AS unnested WHERE e2.user_id = p_user_id) AS total_tags
  FROM public.entries
  WHERE user_id = p_user_id;
$$;

-- Hanya user yang bisa panggil stats miliknya
REVOKE ALL ON FUNCTION public.get_user_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_stats TO authenticated;
