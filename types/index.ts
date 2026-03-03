// types/index.ts

export type EntryType = 'word' | 'sentence' | 'explanation'

export interface Entry {
  id: string
  user_id: string
  type: EntryType
  title: string | null
  content: string
  tags: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type CreateEntryInput = Pick<Entry, 'type' | 'title' | 'content' | 'tags'>

// Gunakan interface eksplisit (bukan Partial<Pick<...>>) agar kompatibel
// dengan Supabase TypeScript generics di strict mode
export type UpdateEntryInput = {
  type?: EntryType
  title?: string | null
  content?: string
  tags?: string[]
  is_favorite?: boolean
}

export type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc'
export type FilterType = 'all' | EntryType

export interface AppState {
  entries: Entry[]
  currentFilter: FilterType
  currentTag: string | null
  sortOption: SortOption
  activeModes: Set<'prefix' | 'middle' | 'suffix'>
  currentPrefix: string
  currentMiddle: string
  currentSuffix: string
  currentType: EntryType
  showFavoritesOnly: boolean
}

// ── Database type ─────────────────────────────────────────────────────────────
// Harus menggunakan struktur yang kompatibel dengan @supabase/supabase-js v2.44+
// Field `Relationships` wajib ada agar generics bisa di-resolve dengan benar
// dan tidak jatuh ke `never` saat memanggil .update(), .insert(), dsb.
export interface Database {
  public: {
    Tables: {
      entries: {
        Row: Entry
        Insert: {
          user_id: string
          type: EntryType
          title?: string | null
          content: string
          tags?: string[]
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          type?: EntryType
          title?: string | null
          content?: string
          tags?: string[]
          is_favorite?: boolean
          updated_at?: string
        }
        // WAJIB di supabase-js v2.44+ agar TypeScript tidak resolve ke `never`
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
