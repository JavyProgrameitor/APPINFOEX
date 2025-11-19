// app/admin/delete/page.tsx
// app/admin/delete/page.tsx
import { Suspense } from 'react'
import AdminDeleteUserPageClient from './AdminDeleteUserPageClient'

type SearchParams = {
  dni?: string | string[]
  id?: string | string[]
}

type PageProps = {
  searchParams: Promise<SearchParams>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams

  const dniParam = Array.isArray(params.dni) ? params.dni[0] : params.dni
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id

  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground">Cargando página de eliminación…</p>
        </main>
      }
    >
      <AdminDeleteUserPageClient initialDni={dniParam} initialId={idParam} />
    </Suspense>
  )
}
