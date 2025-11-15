'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getSupabaseBrowser } from '@/server/client'
import { RefreshCcw, Search, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'

// Select (shadcn/Radix)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

// --- Tipos ---
interface Unidad {
  id: string
  nombre: string
  zona: string
}
interface Municipio {
  id: string
  nombre: string
  zona: string
}
interface Caseta {
  id: string
  nombre: string
  municipio_id: string
}
interface UsuarioBF {
  id: string
  dni: string | null
  nombre: string
  apellidos: string
  email: string | null
  unidad_id: string | null
  caseta_id: string | null
  creado_en: string
  rol: 'bf' | 'jr' | 'admin'
}

// Tamaños disponibles
const PAGE_SIZES = [5, 10, 20, 40, 60] as const
type Scope = 'unidad' | 'caseta'

export default function AdminHomePage() {
  // UI
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  // filtros “list” integrados aquí
  const [zona, setZona] = useState<string>('')
  const [scope, setScope] = useState<Scope>('unidad')
  const [unidadId, setUnidadId] = useState<string>('')
  const [casetaId, setCasetaId] = useState<string>('')

  // paginación
  const [page, setPage] = useState(1) // 1-based
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(40)

  // datos
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [casetas, setCasetas] = useState<Caseta[]>([])
  const [items, setItems] = useState<UsuarioBF[]>([])
  const [total, setTotal] = useState(0)

  // lookups
  const unidadById = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades])
  const municipioById = useMemo(() => new Map(municipios.map((m) => [m.id, m])), [municipios])
  const casetaById = useMemo(() => new Map(casetas.map((c) => [c.id, c])), [casetas])

  // zonas disponibles
  const zonas = useMemo(() => {
    const z = new Set<string>()
    for (const u of unidades) z.add(u.zona)
    for (const m of municipios) z.add(m.zona)
    return Array.from(z).sort()
  }, [unidades, municipios])

  // derivados por zona
  const unidadesEnZona = useMemo(
    () => unidades.filter((u) => (zona ? u.zona === zona : true)),
    [unidades, zona],
  )
  const casetasEnZona = useMemo(
    () =>
      casetas.filter((c) => {
        if (!zona) return true
        const mun = municipioById.get(c.municipio_id)
        return mun?.zona === zona
      }),
    [casetas, zona, municipioById],
  )

  // normalizar query
  const normQ = useMemo(() => q.trim().toLowerCase(), [q])

  // carga inicial de catálogos
  useEffect(() => {
    ;(async () => {
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoading(true)
      try {
        const [{ data: u }, { data: m }, { data: c }] = await Promise.all([
          supa.from('unidades').select('id,nombre,zona').order('nombre'),
          supa.from('municipios').select('id,nombre,zona').order('nombre'),
          supa.from('casetas').select('id,nombre,municipio_id').order('nombre'),
        ])
        setUnidades((u as Unidad[]) || [])
        setMunicipios((m as Municipio[]) || [])
        setCasetas((c as Caseta[]) || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
          .select('id,dni,nombre,apellidos,email,unidad_id,caseta_id,creado_en,rol', {
            count: 'exact',
          })
          .in('rol', ['bf', 'jr'])
          .order('apellidos', { ascending: true })
          .order('nombre', { ascending: true, nullsFirst: false })

        // filtro por zona + unidad/caseta
        if (zona) {
          if (scope === 'unidad') {
            const unitIds = unidades.filter((u) => u.zona === zona).map((u) => u.id)
            if (unitIds.length) {
              query = query.in('unidad_id', unitIds)
            } else {
              query = query.eq('unidad_id', null)
            }
            if (unidadId) query = query.eq('unidad_id', unidadId)
          } else {
            const casetasZona = casetas.filter((c) => {
              const mun = municipioById.get(c.municipio_id)
              return mun?.zona === zona
            })
            const casetasIds = casetasZona.map((c) => c.id)
            if (casetasIds.length) {
              query = query.in('caseta_id', casetasIds)
            } else {
              query = query.eq('caseta_id', null)
            }
            if (casetaId) query = query.eq('caseta_id', casetaId)
          }
        }

        // búsqueda libre
        if (normQ) {
          const like = `%${normQ}%`
          query = query.or(
            `dni.ilike.${like},nombre.ilike.${like},apellidos.ilike.${like},email.ilike.${like}`,
          )
        }

        const { data, count, error } = await query.range(from, to)
        if (error) throw error

        setItems((data as UsuarioBF[]) || [])
        setTotal(count || 0)
      } catch (err) {
        console.error(err)
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    })()
  }, [page, pageSize, normQ, zona, scope, unidadId, casetaId, unidades, casetas, municipioById])

  // reset de página al cambiar filtros/tamaño
  useEffect(() => {
    setPage(1)
  }, [pageSize, normQ, zona, scope, unidadId, casetaId])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  function refresh() {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 shadow-accent">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-center text-xl md:text-2xl font-bold text-accent">
          Bomberos y Jefes de Servicio
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            aria-label="Recargar"
            className="rounded-sm"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>

          {/* Select de Zona */}
          <Select value={zona} onValueChange={setZona}>
            <SelectTrigger className="min-w-40 rounded-sm">
              <SelectValue placeholder="Elegir zona" />
            </SelectTrigger>
            <SelectContent className="rounded-xs">
              {zonas.map((z) => (
                <SelectItem key={z} value={z} className="text-center">
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Toggle de ámbito */}
          <div className="inline-flex rounded-sm border overflow-hidden ">
            <Button
              type="button"
              variant={scope === 'unidad' ? 'default' : 'ghost'}
              className={`rounded-sm ${scope === 'unidad' ? '' : 'bg-transparent'}`}
              onClick={() => setScope('unidad')}
            >
              Unidades
            </Button>
            <Button
              type="button"
              variant={scope === 'caseta' ? 'default' : 'ghost'}
              className={`rounded-sm border-l ${scope === 'caseta' ? '' : 'bg-transparent'}`}
              onClick={() => setScope('caseta')}
            >
              Casetas
            </Button>
          </div>

          {/* Select de Unidad/Caseta */}
          {scope === 'unidad' ? (
            <Select value={unidadId} onValueChange={setUnidadId} disabled={!zona}>
              <SelectTrigger className="min-w-56 rounded-sm">
                <SelectValue placeholder={zona ? 'Elegir unidad…' : 'Primero elige zona'} />
              </SelectTrigger>
              <SelectContent className="rounded-xs max-h-64">
                {unidadesEnZona.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-center">
                    {u.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={casetaId} onValueChange={setCasetaId} disabled={!zona}>
              <SelectTrigger className="min-w-56 rounded-sm">
                <SelectValue placeholder={zona ? 'Elegir caseta…' : 'Primero elige zona'} />
              </SelectTrigger>
              <SelectContent className="rounded-sm max-h-64">
                {casetasEnZona.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-center">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Card className="shadow-accent">
        <CardHeader className="gap-2">
          <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:text-xl">
            <span>
              <User className="inline mr-2 h-5 w-5" />
              {total} Bomberos registrado{total === 1 ? '' : 's'}
              {normQ ? (
                <span className="text-muted-foreground">
                  {' '}
                  · filtro: <span className="font-black">“{q.trim()}”</span>
                </span>
              ) : null}
            </span>

            <div className="relative md:max-w-xl text-xs">
              <Search className="absolute top-4 h-4 opacity-60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busqueda por DNI, nombre, apellidos o email…"
                className="pl-8 w-80 rounded-sm"
              />
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 shadow-accent">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((u) => {
                const unidad = u.unidad_id ? unidadById.get(u.unidad_id) : undefined
                const caseta = u.caseta_id ? casetaById.get(u.caseta_id) : undefined
                const chipZona =
                  unidad?.zona || (caseta ? municipioById.get(caseta.municipio_id)?.zona : '—')
                return (
                  <Link key={u.id} href={`/admin/list?id=${u.id}`} className="block">
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm truncate">
                            {u.apellidos ? `${u.apellidos}, ${u.nombre}` : u.nombre}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {chipZona}
                            </div>
                            <div className="text-[10px] px-2 py-0.5 rounded-full border bg-background">
                              {u.rol === 'jr' ? 'JR' : 'BF'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 text-sm font-mono tracking-tight">
                          DNI: <span className="font-semibold">{u.dni || '—'}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {unidad
                            ? `Unidad: ${unidad.nombre}`
                            : caseta
                              ? `Caseta: ${caseta.nombre}`
                              : 'Sin asignación'}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Tamaño de página */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Bomberos por página:</span>
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
