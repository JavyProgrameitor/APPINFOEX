// app/admin/list/page.tsx
import { Suspense } from 'react'
import AdminListBFPageClient from './AdminListBFPageClient'

type SearchParams = {
  id?: string | string[]
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const idParam = Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id

  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </main>
      }
    >
      <AdminListBFPageClient userId={idParam} />
    </Suspense>
  )
}
