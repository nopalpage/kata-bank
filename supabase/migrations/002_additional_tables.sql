-- ══════════════════════════════════════════════════════════════════════════════
-- KATA-BANK — Migration 003: Tabel-tabel Relevan
-- Jalankan di: Supabase Dashboard → SQL Editor
-- Jalankan SETELAH 001_init.sql sudah berhasil
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: Fungsi updated_at universal (dipakai semua tabel baru)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES — Profil lengkap user
--    Diperluas dari versi sebelumnya: tambah avatar, bio, streak, settings
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS bio           TEXT        CHECK (length(bio) <= 300),
  ADD COLUMN IF NOT EXISTS streak_days   INT         DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_active   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS settings      JSONB       DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- settings JSONB menyimpan preferensi: tema, notifikasi, dll
-- Contoh: {"theme":"dark","notifications":true,"daily_goal":10}
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR length(bio) <= 300);

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tambah policy INSERT untuk profiles (dibutuhkan saat registrasi manual)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COLLECTIONS — Folder/koleksi untuk mengelompokkan entries
--    Contoh: "Kata Sulit", "Bahasa Inggris B2", "Persiapan TOEFL"
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.collections (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT        CHECK (length(description) <= 500),
  color       TEXT        DEFAULT '#c8a96e' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  icon        TEXT        DEFAULT '📁'     CHECK (length(icon) <= 10),
  is_pinned   BOOLEAN     DEFAULT false NOT NULL,
  sort_order  INT         DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE TRIGGER collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collections"
  ON public.collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS collections_user_id_idx
  ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS collections_user_pinned_idx
  ON public.collections(user_id, is_pinned DESC, sort_order ASC);


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. COLLECTION_ENTRIES — Junction table: entry bisa masuk banyak koleksi
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.collection_entries (
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  entry_id      UUID REFERENCES public.entries(id)     ON DELETE CASCADE NOT NULL,
  added_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (collection_id, entry_id)
);

ALTER TABLE public.collection_entries ENABLE ROW LEVEL SECURITY;

-- User hanya bisa kelola junction jika dia punya collection-nya
CREATE POLICY "Users can manage entries in own collections"
  ON public.collection_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS ce_collection_idx ON public.collection_entries(collection_id);
CREATE INDEX IF NOT EXISTS ce_entry_idx      ON public.collection_entries(entry_id);

-- View: entry dengan info koleksinya (memudahkan query)
CREATE OR REPLACE VIEW public.entries_with_collections AS
  SELECT
    e.*,
    COALESCE(
      json_agg(
        json_build_object('id', c.id, 'name', c.name, 'color', c.color, 'icon', c.icon)
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'
    ) AS collections
  FROM public.entries e
  LEFT JOIN public.collection_entries ce ON ce.entry_id = e.id
  LEFT JOIN public.collections c         ON c.id = ce.collection_id
  GROUP BY e.id;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. STUDY_SESSIONS — Sesi belajar (kapan user mulai & selesai review)
--    Basis untuk statistik harian, streak, dan grafik aktivitas
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at      TIMESTAMPTZ,
  duration_secs INT         GENERATED ALWAYS AS (
                              CASE WHEN ended_at IS NOT NULL
                              THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT
                              ELSE NULL END
                            ) STORED,
  entries_reviewed INT      DEFAULT 0 NOT NULL CHECK (entries_reviewed >= 0),
  correct_count    INT      DEFAULT 0 NOT NULL CHECK (correct_count >= 0),
  mode             TEXT     DEFAULT 'free' CHECK (mode IN ('free', 'flashcard', 'quiz', 'spaced')),
  collection_id    UUID     REFERENCES public.collections(id) ON DELETE SET NULL
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study sessions"
  ON public.study_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sessions_user_date_idx
  ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_user_mode_idx
  ON public.study_sessions(user_id, mode);


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ENTRY_REVIEWS — Review per-entry (spaced repetition / SRS)
--    Menyimpan kapan terakhir review dan seberapa well user tahu kata ini
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.entry_reviews (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  entry_id        UUID        REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  session_id      UUID        REFERENCES public.study_sessions(id) ON DELETE SET NULL,

  -- SRS fields (SM-2 algorithm compatible)
  ease_factor     NUMERIC(4,2) DEFAULT 2.5  NOT NULL CHECK (ease_factor >= 1.3),
  interval_days   INT          DEFAULT 1    NOT NULL CHECK (interval_days >= 0),
  repetitions     INT          DEFAULT 0    NOT NULL CHECK (repetitions >= 0),
  next_review_at  TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Hasil review: 0=lupa, 1=susah, 2=ragu, 3=mudah, 4=sangat mudah
  quality         SMALLINT    CHECK (quality BETWEEN 0 AND 4),

  UNIQUE (user_id, entry_id)  -- satu record SRS per user per entry
);

ALTER TABLE public.entry_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own entry reviews"
  ON public.entry_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reviews_user_next_idx
  ON public.entry_reviews(user_id, next_review_at ASC);
CREATE INDEX IF NOT EXISTS reviews_user_entry_idx
  ON public.entry_reviews(user_id, entry_id);
CREATE INDEX IF NOT EXISTS reviews_due_today_idx
  ON public.entry_reviews(user_id, next_review_at)
  WHERE next_review_at <= NOW();

-- Function: hitung entry yang due untuk review hari ini
CREATE OR REPLACE FUNCTION public.get_due_reviews(p_user_id UUID)
RETURNS TABLE(entry_id UUID, due_since INTERVAL)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT entry_id, NOW() - next_review_at AS due_since
  FROM public.entry_reviews
  WHERE user_id = p_user_id
    AND next_review_at <= NOW()
  ORDER BY next_review_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_due_reviews FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_reviews TO authenticated;

-- Function: update SRS setelah review (implementasi SM-2)
CREATE OR REPLACE FUNCTION public.process_review(
  p_user_id  UUID,
  p_entry_id UUID,
  p_quality  SMALLINT,  -- 0-4
  p_session_id UUID DEFAULT NULL
)
RETURNS public.entry_reviews
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec   public.entry_reviews;
  v_ef    NUMERIC(4,2);
  v_int   INT;
  v_rep   INT;
BEGIN
  -- Ambil atau buat record SRS
  INSERT INTO public.entry_reviews (user_id, entry_id, session_id)
  VALUES (p_user_id, p_entry_id, p_session_id)
  ON CONFLICT (user_id, entry_id) DO UPDATE
    SET session_id = EXCLUDED.session_id
  RETURNING * INTO v_rec;

  v_ef  := v_rec.ease_factor;
  v_int := v_rec.interval_days;
  v_rep := v_rec.repetitions;

  -- SM-2 algorithm
  IF p_quality >= 3 THEN
    -- Benar: naikkan interval
    CASE v_rep
      WHEN 0 THEN v_int := 1;
      WHEN 1 THEN v_int := 6;
      ELSE        v_int := ROUND(v_int * v_ef);
    END CASE;
    v_rep := v_rep + 1;
  ELSE
    -- Salah: reset ke awal
    v_int := 1;
    v_rep := 0;
  END IF;

  -- Update ease factor
  v_ef := v_ef + (0.1 - (4 - p_quality) * (0.08 + (4 - p_quality) * 0.02));
  v_ef := GREATEST(v_ef, 1.3);

  -- Simpan hasil
  UPDATE public.entry_reviews SET
    ease_factor      = v_ef,
    interval_days    = v_int,
    repetitions      = v_rep,
    quality          = p_quality,
    last_reviewed_at = NOW(),
    next_review_at   = NOW() + (v_int || ' days')::INTERVAL
  WHERE user_id = p_user_id AND entry_id = p_entry_id
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

REVOKE ALL ON FUNCTION public.process_review FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_review TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. SHARED_ENTRIES — Bagikan entry via link publik
--    User bisa generate link untuk berbagi kata/kalimat ke orang lain
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shared_entries (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  entry_id    UUID        REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  slug        TEXT        NOT NULL UNIQUE
                          CHECK (slug ~ '^[a-z0-9\-]{6,32}$'),
  is_active   BOOLEAN     DEFAULT true NOT NULL,
  view_count  INT         DEFAULT 0 NOT NULL CHECK (view_count >= 0),
  expires_at  TIMESTAMPTZ,  -- NULL = tidak expired
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.shared_entries ENABLE ROW LEVEL SECURITY;

-- Pemilik bisa kelola share miliknya
CREATE POLICY "Users can manage own shared entries"
  ON public.shared_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Siapa saja bisa SELECT share yang aktif dan belum expired (untuk public link)
CREATE POLICY "Anyone can view active shares"
  ON public.shared_entries FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE INDEX IF NOT EXISTS shared_slug_idx    ON public.shared_entries(slug);
CREATE INDEX IF NOT EXISTS shared_user_idx    ON public.shared_entries(user_id);
CREATE INDEX IF NOT EXISTS shared_active_idx  ON public.shared_entries(is_active, expires_at)
  WHERE is_active = true;

-- Function: generate random slug unik
CREATE OR REPLACE FUNCTION public.generate_share_slug()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_slug TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- 8 karakter alphanumeric acak
    v_slug := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.shared_entries WHERE slug = v_slug) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_slug;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ACTIVITY_LOG — Log aktivitas harian user
--    Dipakai untuk: streak hitung mundur, grafik kalender aktivitas (GitHub-style)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.activity_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE        DEFAULT CURRENT_DATE NOT NULL,
  entries_added   INT       DEFAULT 0 NOT NULL CHECK (entries_added >= 0),
  entries_edited  INT       DEFAULT 0 NOT NULL CHECK (entries_edited >= 0),
  entries_reviewed INT      DEFAULT 0 NOT NULL CHECK (entries_reviewed >= 0),
  study_secs      INT       DEFAULT 0 NOT NULL CHECK (study_secs >= 0),

  UNIQUE (user_id, activity_date)  -- satu baris per user per hari
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity log"
  ON public.activity_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_user_date_idx
  ON public.activity_log(user_id, activity_date DESC);

-- Function: upsert log harian (dipanggil otomatis via trigger)
CREATE OR REPLACE FUNCTION public.upsert_activity(
  p_user_id        UUID,
  p_entries_added  INT DEFAULT 0,
  p_entries_edited INT DEFAULT 0,
  p_entries_reviewed INT DEFAULT 0,
  p_study_secs     INT DEFAULT 0
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_log (
    user_id, activity_date,
    entries_added, entries_edited, entries_reviewed, study_secs
  )
  VALUES (
    p_user_id, CURRENT_DATE,
    p_entries_added, p_entries_edited, p_entries_reviewed, p_study_secs
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    entries_added    = activity_log.entries_added    + EXCLUDED.entries_added,
    entries_edited   = activity_log.entries_edited   + EXCLUDED.entries_edited,
    entries_reviewed = activity_log.entries_reviewed + EXCLUDED.entries_reviewed,
    study_secs       = activity_log.study_secs       + EXCLUDED.study_secs;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_activity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_activity TO authenticated;

-- Trigger: otomatis log saat entry ditambah
CREATE OR REPLACE FUNCTION public.log_entry_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.upsert_activity(NEW.user_id, 1, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER entries_log_insert
  AFTER INSERT ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.log_entry_insert();

-- Trigger: otomatis log saat entry diedit
CREATE OR REPLACE FUNCTION public.log_entry_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.upsert_activity(NEW.user_id, 0, 1, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER entries_log_update
  AFTER UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.log_entry_update();

-- Function: hitung streak saat ini (hari berturut-turut aktif)
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_streak    INT := 0;
  v_check     DATE := CURRENT_DATE;
  v_has_today BOOLEAN;
BEGIN
  -- Cek apakah hari ini sudah ada aktivitas
  SELECT EXISTS(
    SELECT 1 FROM public.activity_log
    WHERE user_id = p_user_id AND activity_date = CURRENT_DATE
  ) INTO v_has_today;

  IF NOT v_has_today THEN
    -- Mulai cek dari kemarin
    v_check := CURRENT_DATE - 1;
  END IF;

  LOOP
    IF EXISTS(
      SELECT 1 FROM public.activity_log
      WHERE user_id = p_user_id AND activity_date = v_check
    ) THEN
      v_streak := v_streak + 1;
      v_check  := v_check - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_streak FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_streak TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 8. ENTRY_NOTES — Catatan pribadi per entry (anotasi, konteks, contoh kalimat)
--    User bisa tambah multiple notes ke satu entry
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.entry_notes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id)    ON DELETE CASCADE NOT NULL,
  entry_id   UUID        REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  content    TEXT        NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  note_type  TEXT        DEFAULT 'note'
               CHECK (note_type IN ('note', 'example', 'mnemonic', 'etymology', 'synonym', 'antonym')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE TRIGGER entry_notes_updated_at
  BEFORE UPDATE ON public.entry_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.entry_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own entry notes"
  ON public.entry_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notes_entry_idx   ON public.entry_notes(entry_id);
CREATE INDEX IF NOT EXISTS notes_user_idx    ON public.entry_notes(user_id);
CREATE INDEX IF NOT EXISTS notes_type_idx    ON public.entry_notes(user_id, note_type);


-- ══════════════════════════════════════════════════════════════════════════════
-- 9. IMPORT_JOBS — Track pekerjaan import massal (CSV / JSON)
--    Saat user import banyak entry sekaligus, status bisa dipantau
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status        TEXT        DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  source_format TEXT        DEFAULT 'json'
                  CHECK (source_format IN ('json', 'csv', 'anki', 'quizlet')),
  total_rows    INT         DEFAULT 0 NOT NULL CHECK (total_rows >= 0),
  imported_rows INT         DEFAULT 0 NOT NULL CHECK (imported_rows >= 0),
  skipped_rows  INT         DEFAULT 0 NOT NULL CHECK (skipped_rows >= 0),
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  finished_at   TIMESTAMPTZ
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own import jobs"
  ON public.import_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS import_user_idx ON public.import_jobs(user_id, started_at DESC);


-- ══════════════════════════════════════════════════════════════════════════════
-- 10. NOTIFICATIONS — Notifikasi in-app
--     Contoh: "10 entry due untuk review hari ini", "Streak 7 hari!"
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT        NOT NULL
               CHECK (type IN ('streak', 'review_due', 'milestone', 'import_done', 'system')),
  title      TEXT        NOT NULL CHECK (length(title) <= 100),
  message    TEXT        CHECK (length(message) <= 500),
  is_read    BOOLEAN     DEFAULT false NOT NULL,
  action_url TEXT,       -- URL yang dibuka saat notif diklik
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notif_user_unread_idx
  ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notif_user_idx
  ON public.notifications(user_id, created_at DESC);

-- Aktifkan Realtime untuk notifikasi (user dapat notif real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ══════════════════════════════════════════════════════════════════════════════
-- REALTIME: Aktifkan untuk tabel yang perlu live update
-- ══════════════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entry_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;


-- ══════════════════════════════════════════════════════════════════════════════
-- DASHBOARD VIEW — Semua statistik user dalam satu query
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Entries
    'total_entries',      (SELECT COUNT(*) FROM public.entries WHERE user_id = p_user_id),
    'total_words',        (SELECT COUNT(*) FROM public.entries WHERE user_id = p_user_id AND type = 'word'),
    'total_sentences',    (SELECT COUNT(*) FROM public.entries WHERE user_id = p_user_id AND type = 'sentence'),
    'total_explanations', (SELECT COUNT(*) FROM public.entries WHERE user_id = p_user_id AND type = 'explanation'),
    'total_favorites',    (SELECT COUNT(*) FROM public.entries WHERE user_id = p_user_id AND is_favorite = true),
    -- Tags
    'total_tags',         (SELECT COUNT(DISTINCT t) FROM public.entries e, UNNEST(e.tags) t WHERE e.user_id = p_user_id),
    -- Collections
    'total_collections',  (SELECT COUNT(*) FROM public.collections WHERE user_id = p_user_id),
    -- Reviews
    'due_reviews',        (SELECT COUNT(*) FROM public.entry_reviews WHERE user_id = p_user_id AND next_review_at <= NOW()),
    'total_reviewed',     (SELECT COUNT(*) FROM public.entry_reviews WHERE user_id = p_user_id AND repetitions > 0),
    -- Streak
    'current_streak',     public.get_current_streak(p_user_id),
    -- Activity this week (7 hari terakhir)
    'week_activity',      (
      SELECT json_agg(row_to_json(a) ORDER BY a.activity_date)
      FROM (
        SELECT activity_date, entries_added, entries_reviewed, study_secs
        FROM public.activity_log
        WHERE user_id = p_user_id
          AND activity_date >= CURRENT_DATE - 6
        ORDER BY activity_date
      ) a
    ),
    -- Entries added this week
    'entries_this_week',  (
      SELECT COALESCE(SUM(entries_added), 0)
      FROM public.activity_log
      WHERE user_id = p_user_id
        AND activity_date >= CURRENT_DATE - 6
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- RINGKASAN TABEL YANG DIBUAT
-- ══════════════════════════════════════════════════════════════════════════════
-- public.profiles          — Profil user (avatar, bio, streak, settings)
-- public.collections       — Folder/koleksi untuk mengelompokkan entries
-- public.collection_entries— Junction: entries ↔ collections (many-to-many)
-- public.study_sessions    — Sesi belajar (waktu, jumlah review, mode)
-- public.entry_reviews     — SRS per entry (SM-2: interval, ease factor)
-- public.shared_entries    — Link publik untuk berbagi entry
-- public.activity_log      — Log harian (streak, grafik aktivitas)
-- public.entry_notes       — Catatan per entry (contoh, mnemonic, sinonim)
-- public.import_jobs       — Status import massal (CSV/JSON)
-- public.notifications     — Notifikasi in-app real-time
-- ══════════════════════════════════════════════════════════════════════════════
