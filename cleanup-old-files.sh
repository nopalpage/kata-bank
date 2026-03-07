#!/bin/bash
# cleanup-old-files.sh
# Jalankan script ini di folder root repo kamu SEBELUM push ke GitHub
# Tujuan: menghapus semua file dari proyek Lexica lama

echo "🧹 Menghapus file-file lama dari proyek Lexica..."

# File-file lama yang harus dihapus
rm -f app/api/entries/route.ts
rm -f app/api/entries/\[id\]/route.ts
rm -f components/LexicaApp.tsx
rm -f hooks/useDebounce.ts
rm -f lib/rate-limit.ts
rm -f lib/fetch-with-retry.ts
rm -f lib/validation.ts
rm -f proxy.ts
rm -f public/sw.js

# Hapus folder lama jika kosong
rmdir app/api/entries/\[id\] 2>/dev/null || true
rmdir app/api/entries 2>/dev/null || true
rmdir hooks 2>/dev/null || true

echo "✅ File lama dihapus!"
echo ""
echo "📋 File yang tersisa:"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" -o -name "*.css" -o -name "*.json" -o -name "*.sql" \) \
  | grep -v node_modules | grep -v .git | grep -v .next | sort
