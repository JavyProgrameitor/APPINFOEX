// app/admin/delete/page.tsx
import { Suspense } from 'react'
import AdminDeleteUserPageClient from './deleteUserClient'

export default function AdminDeleteUserPage() {
  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground">Cargando página de eliminación…</p>
        </main>
      }
    >
      <AdminDeleteUserPageClient />
    </Suspense>
  )
}
