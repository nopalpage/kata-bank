// lib/utils.ts

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins} menit yang lalu`
  if (hours < 24) return `${hours} jam yang lalu`
  if (days < 7) return `${days} hari yang lalu`
  return formatDateShort(dateStr)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export const CATEGORIES: Record<string, { name: string; color: string; icon: string; description: string }> = {
  strategi: {
    name: 'Strategi & Taktik',
    color: '#FF6B35',
    icon: '⚔️',
    description: 'Panduan memenangkan permainan sambung kata'
  },
  kosakata: {
    name: 'Kosakata',
    color: '#4ECDC4',
    icon: '📚',
    description: 'Koleksi kata-kata penting untuk dimainkan'
  },
  'tips-trik': {
    name: 'Tips & Trik',
    color: '#FFE66D',
    icon: '💡',
    description: 'Tips rahasia para pemain veteran'
  },
  panduan: {
    name: 'Panduan Pemula',
    color: '#A8EDEA',
    icon: '🗺️',
    description: 'Mulai bermain dari nol hingga mahir'
  },
  edukasi: {
    name: 'Edukasi Bahasa',
    color: '#C9B8FF',
    icon: '🎓',
    description: 'Belajar Bahasa Indonesia sambil bermain'
  },
  berita: {
    name: 'Berita & Update',
    color: '#FFC2D1',
    icon: '📰',
    description: 'Informasi terbaru tentang game'
  },
}

export function getCategoryColor(slug: string): string {
  return CATEGORIES[slug]?.color ?? '#FF6B35'
}

export function getCategoryName(slug: string): string {
  return CATEGORIES[slug]?.name ?? slug
}

export function getCategoryIcon(slug: string): string {
  return CATEGORIES[slug]?.icon ?? '📝'
}

export function readTime(content: string): number {
  const words = content.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}
