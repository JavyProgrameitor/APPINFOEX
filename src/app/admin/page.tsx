'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { RefreshCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Tipos ---
interface Usuario {
  id: string
  dni: string | null
  nombre: string
  apellidos: string
  email: string | null
}

// Tamaños disponibles
const PAGE_SIZES = [20, 40, 60] as const

export default function AdminHomePage() {
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  // paginación
  const [page, setPage] = useState(1) // 1-based
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(40)

  // datos
  const [items, setItems] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)

  // normalizar query (evitar re-renders)
  const normQ = useMemo(() => q.trim(), [q])

  // cargar usuarios con filtros + paginación
  useEffect(() => {
    ;(async () => {
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoading(true)

      try {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos,email', { count: 'exact' })
          .order('apellidos', { ascending: true })
          .order('nombre', { ascending: true, nullsFirst: false })

        if (normQ) {
          // Buscar por DNI, nombre, apellidos y email (case-insensitive)
          const like = `%${normQ}%`
          query = query.or(
            `dni.ilike.${like},nombre.ilike.${like},apellidos.ilike.${like},email.ilike.${like}`,
          )
        }

        const { data, count, error } = await query.range(from, to)
        if (error) throw error

        setItems((data as Usuario[]) || [])
        setTotal(count || 0)
      } catch (err) {
        console.error(err)
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    })()
  }, [page, pageSize, normQ])

  // cuando cambie el pageSize o el filtro, vuelve a la página 1
  useEffect(() => {
    setPage(1)
  }, [pageSize, normQ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  function refresh() {
    // refresco simple: re-dispara el efecto cambiando el page a sí mismo con clamp
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 shadow-accent">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-center text-xl md:text-2xl font-semibold">J.R Y Bomberos</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tamaño de página */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Tamaño:</span>
            {PAGE_SIZES.map((sz) => (
              <Button
                key={sz}
                size="sm"
                variant={pageSize === sz ? 'default' : 'outline'}
                className="rounded-sm"
                onClick={() => setPageSize(sz)}
                aria-pressed={pageSize === sz}
              >
                {sz}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            aria-label="Recargar"
            className="rounded-sm"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="shadow-accent">
        <CardHeader className="gap-2">
          <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-base md:text-lg">
            <span>
              {total} usuario{total === 1 ? '' : 's'}
              {normQ ? (
                <span className="text-muted-foreground">
                  {' '}
                  · filtro: <span className="font-medium">“{normQ}”</span>
                </span>
              ) : null}
            </span>

            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por DNI, nombre, apellidos o email…"
                className="pl-8 rounded-sm"
              />
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 shadow-accent">
          {/* Grid de cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ">
              {items.map((u) => (
                <li key={u.id}>
                  <div className="rounded-xl border-3 border-accent p-3 h-full">
                    <div className="font-medium truncate">
                      {u.apellidos ? `${u.apellidos}, ${u.nombre}` : u.nombre}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      DNI: <span className="font-mono">{u.dni || '—'}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      Email: <span className="font-mono break-all">{u.email || '—'}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Paginación */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn('rounded-sm')}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn('rounded-sm')}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext || loading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
