// app/admin/delete/page.tsx
// app/admin/delete/page.tsx
/*
import { Suspense } from 'react'
import AdminDeleteUserPageClient from './deleteUserClient'

type SearchParams = {
  dni?: string | string[]
  id?: string | string[]
}

export default function AdminDeleteUserPage({ searchParams }: { searchParams: SearchParams }) {
  const dniParam = Array.isArray(searchParams.dni) ? searchParams.dni[0] : searchParams.dni

  const idParam = Array.isArray(searchParams.id) ? searchParams.id[0] : searchParams.id

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
*/
