// app/admin/artikel/[id]/edit/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ArticleEditor from '@/components/ArticleEditor'
import type { Article } from '@/types'

interface Props { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <ArticleEditor article={data as Article} mode="edit" />
}
