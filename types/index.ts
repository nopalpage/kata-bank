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
export type UpdateEntryInput = Partial<Pick<Entry, 'type' | 'title' | 'content' | 'tags' | 'is_favorite'>>

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

export interface Database {
  public: {
    Tables: {
      entries: {
        Row: Entry
        Insert: Omit<Entry, 'id' | 'user_id' | 'created_at' | 'updated_at'>
        Update: UpdateEntryInput
      }
    }
  }
}
