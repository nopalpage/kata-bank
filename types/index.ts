// types/index.ts

export type CategorySlug =
  | 'strategi'
  | 'kosakata'
  | 'tips-trik'
  | 'panduan'
  | 'edukasi'
  | 'berita'

export interface Category {
  id: string
  name: string
  slug: CategorySlug | string
  description: string | null
  color: string
  icon: string
  article_count?: number
}

export interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string
  tags: string[]
  cover_emoji: string | null
  is_published: boolean
  is_featured: boolean
  view_count: number
  author_id: string
  author_name: string | null
  created_at: string
  updated_at: string
}

export type ArticleWithCategory = Article & {
  category_data?: Category
}

export type CreateArticleInput = Pick<
  Article,
  'title' | 'slug' | 'excerpt' | 'content' | 'category' | 'tags' | 'cover_emoji' | 'is_published' | 'is_featured'
>

export type UpdateArticleInput = Partial<CreateArticleInput>

export interface AdminUser {
  id: string
  email: string
  name: string
}

export interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
  created_at: string
}
