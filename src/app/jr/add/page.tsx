'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardTitle, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, UserCheck2 } from 'lucide-react'

type Bombero = {
  dni: string
  nombre: string
  apellidos: string
}

type JRContext = {
  tipo: 'unidad' | 'caseta'
  zona: string
  municipio?: string
  unidad?: string
  caseta?: string
  unidad_id?: string
  caseta_id?: string
  ls?: string
}

const CTX_KEY = 'INFOEX:jr:ctx'

// helpers de clave
function computeListaKey(ctx: JRContext | null): string | null {
  if (!ctx) return null
  if (ctx.ls) return ctx.ls
  const parte =
    ctx.tipo === 'unidad'
      ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
      : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`
  return `INFOEX:lista:${ctx.tipo}:${parte}`
}
function computeLegacyKey(ctx: JRContext | null): string | null {
  if (!ctx) return null
  const base = ctx.tipo === 'unidad' ? `unidad:${ctx.unidad_id}` : `caseta:${ctx.caseta_id}`
  return `jr.bomberos.${ctx.zona}.${base}`
}

// normalizadores y emparejado A/B
function norm(s?: string) {
  return (s || '')
    .toLowerCase()
    .replaceAll('.', '')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function isUnitA(name?: string) {
  const n = norm(name)
  return /\s+a$/.test(n) || n === 'unidad a' || n === 'u a' || n === 'ua' || n === 'a'
}
function isUnitB(name?: string) {
  const n = norm(name)
  return /\s+b$/.test(n) || n === 'unidad b' || n === 'u b' || n === 'ub' || n === 'b'
}

function baseName(name?: string) {
  let n = norm(name)
  n = n.replace(/\s+[ab]$/, '')
  return n
}

function groupByUnidad(usuarios: (Bombero & { unidad_id: string; unidad_nombre: string })[]) {
  const mapa: Record<string, { unidad_id: string; unidad_nombre: string; miembros: Bombero[] }> = {}
  for (const u of usuarios) {
    const key = u.unidad_id
    if (!mapa[key]) {
      mapa[key] = {
        unidad_id: u.unidad_id,
        unidad_nombre: u.unidad_nombre,
        miembros: [],
      }
    }
    mapa[key].miembros.push({
      dni: u.dni,
      nombre: u.nombre,
      apellidos: u.apellidos,
    })
  }
  return Object.values(mapa)
}

function AgregarBomberos() {
  const router = useRouter()
  const params = useSearchParams()

  // 1) Contexto
  const urlTipo = params.get('tipo') as 'unidad' | 'caseta' | null
  const urlZona = params.get('zona')
  const urlMunicipio = params.get('municipio')
  const urlUnidad = params.get('unidad')
  const urlCaseta = params.get('caseta')
  const urlUnidadId = params.get('unidad_id')
  const urlCasetaId = params.get('caseta_id')
  const urlLs = params.get('ls')

  const [ctx, setCtx] = useState<JRContext | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    if (urlTipo && urlZona) {
      const nuevo: JRContext = {
        tipo: urlTipo,
        zona: urlZona,
        municipio: urlMunicipio || undefined,
        unidad: urlUnidad || undefined,
        caseta: urlCaseta || undefined,
        unidad_id: urlUnidadId || undefined,
        caseta_id: urlCasetaId || undefined,
        ls: urlLs || undefined,
      }
      setCtx(nuevo)
      try {
        localStorage.setItem(CTX_KEY, JSON.stringify(nuevo))
      } catch {}
      return
    }
    try {
      const raw = localStorage.getItem(CTX_KEY)
      if (raw) setCtx(JSON.parse(raw))
    } catch {}
  }, [urlTipo, urlZona, urlMunicipio, urlUnidad, urlCaseta, urlUnidadId, urlCasetaId, urlLs])

  const storageKey = useMemo(() => computeListaKey(ctx), [ctx])
  const legacyKey = useMemo(() => computeLegacyKey(ctx), [ctx])

  // 2) Selección previa
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({})
  const [, setListaInicial] = useState<Bombero[] | null>(null)

  useEffect(() => {
    if (!storageKey) return
    setLoadedKey(storageKey)
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const arr: Bombero[] = JSON.parse(raw)
        setListaInicial(arr)
        const map: Record<string, boolean> = {}
        for (const b of arr) map[b.dni] = true
        setSeleccion(map)
        return
      }
      if (legacyKey) {
        const legacyRaw = localStorage.getItem(legacyKey)
        if (legacyRaw) {
          const arr: Bombero[] = JSON.parse(legacyRaw)
          setListaInicial(arr)
          const map: Record<string, boolean> = {}
          for (const b of arr) map[b.dni] = true
          setSeleccion(map)
          localStorage.setItem(storageKey, legacyRaw)
          return
        }
      }
      setListaInicial([])
      setSeleccion({})
    } catch {
      setListaInicial([])
      setSeleccion({})
    }
  }, [storageKey, legacyKey])

  // 3) Cargar miembros y filtrar por pareja A/B de la MISMA base
  const [miembros, setMiembros] = useState<
    (Bombero & { unidad_id: string; unidad_nombre: string })[] | null
  >(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!ctx?.zona) return
      setCargando(true)
      setMensaje(null)
      try {
        const res = await fetch(`/supabase/usuarios/zona?zona=${encodeURIComponent(ctx.zona)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          setMensaje('No se pudieron cargar los miembros de la zona.')
          setMiembros([])
          return
        }
        const json = await res.json()

        const unidades: { id: string; nombre: string }[] = (json.unidades || []) as any[]

        const unidadesById: Record<string, string> = {}
        for (const u of unidades) unidadesById[u.id] = u.nombre

        // Resolver mi unidad (id o por nombre aproximado)
        let myUnitId = ctx.unidad_id || undefined
        let myUnitName: string | undefined = undefined

        if (myUnitId && unidadesById[myUnitId]) {
          myUnitName = unidadesById[myUnitId]
        } else if (ctx.unidad) {
          // buscar por base aproximada
          const targetBase = baseName(ctx.unidad)
          const candidate = unidades.find((u) => baseName(u.nombre) === targetBase)
          if (candidate) {
            myUnitId = candidate.id
            myUnitName = candidate.nombre
          }
        }

        // Si soy A o B, quiero la pareja A/B de la MISMA base
        let allowedIds = new Set<string>()
        if (myUnitName) {
          const myBase = baseName(myUnitName)
          const isAorB = isUnitA(myUnitName) || isUnitB(myUnitName)
          if (isAorB) {
            for (const u of unidades) {
              if (baseName(u.nombre) === myBase && (isUnitA(u.nombre) || isUnitB(u.nombre))) {
                allowedIds.add(u.id)
              }
            }
          }
        }

        if (allowedIds.size === 0 && myUnitId) {
          allowedIds.add(myUnitId)
        }

        if (allowedIds.size === 0) {
          setMensaje('No se encontraron unidades permitidas para tu contexto.')
          setMiembros([])
          return
        }

        const todos = ((json.usuarios as any[]) || []).map((u) => ({
          dni: u.dni as string,
          nombre: u.nombre as string,
          apellidos: u.apellidos as string,
          unidad_id: u.unidad_id as string,
          unidad_nombre: unidadesById[u.unidad_id] ?? '',
        }))

        const lista = todos.filter((u) => u.unidad_id && allowedIds.has(u.unidad_id))
        setMiembros(lista)
      } catch {
        setMensaje('Error al cargar miembros.')
        setMiembros([])
      } finally {
        setCargando(false)
      }
    })()
  }, [ctx?.zona, ctx?.unidad_id, ctx?.unidad])

  // Grupos
  const grupos = useMemo(() => (miembros ? groupByUnidad(miembros) : []), [miembros])

  // 4) Persistir selección
  useEffect(() => {
    if (!storageKey) return
    if (loadedKey !== storageKey) return
    if (!miembros) return
    const seleccionados: Bombero[] = miembros
      .filter((m) => seleccion[m.dni])
      .map((m) => ({ dni: m.dni, nombre: m.nombre, apellidos: m.apellidos }))
    try {
      localStorage.setItem(storageKey, JSON.stringify(seleccionados))
    } catch {}
  }, [seleccion, storageKey, loadedKey, miembros])

  const toggle = (dni: string) => setSeleccion((prev) => ({ ...prev, [dni]: !prev[dni] }))
  const limpiar = () => {
    setSeleccion({})
    try {
      if (storageKey) localStorage.removeItem(storageKey)
    } catch {}
  }
  const goNext = () => router.push('/jr/note' + (ctx ? buildQueryFromCtx(ctx) : ''))
  const goInit = () => router.push('/jr')

  function buildQueryFromCtx(c: JRContext) {
    const p = new URLSearchParams()
    p.set('zona', c.zona)
    p.set('tipo', c.tipo)
    if (c.unidad) p.set('unidad', c.unidad)
    if (c.unidad_id) p.set('unidad_id', c.unidad_id)
    if (c.caseta) p.set('caseta', c.caseta)
    if (c.caseta_id) p.set('caseta_id', c.caseta_id)
    if (c.ls) p.set('ls', c.ls)
    return '?' + p.toString()
  }

  return (
    <>
      <main className="grid place-items-center p-4">
        <Card className=" w-full max-w-3xl rounded-2xl shadow-accent">
          <CardHeader className="flex items-center justify-center gap-2">
            <UserCheck2 />
            <CardTitle className="text-animate">Selecciona de sus Unidades A y B</CardTitle>
          </CardHeader>
          {!ctx ? (
            <div>Cargando contexto…</div>
          ) : cargando ? (
            <div>Cargando miembros…</div>
          ) : (
            <>
              {mensaje ? <div className="text-red-600 text-sm">{mensaje}</div> : null}

              {grupos.length === 0 ? (
                <div>No hay miembros para mostrar.</div>
              ) : (
                grupos.map((g) => (
                  <div key={g.unidad_id} className="p-3">
                    <div className="font-black mb-2 mr-4 text-center text-animate">
                      {g.unidad_nombre}
                    </div>
                    <div className="text-xl grid grid-cols-1 md:grid-cols-2 gap-2">
                      {g.miembros.map((m) => (
                        <label key={m.dni} className="flex items-baseline gap-3 ">
                          <input
                            type="checkbox"
                            checked={!!seleccion[m.dni]}
                            onChange={() => toggle(m.dni)}
                          />
                          <span className="font-bold">
                            {m.nombre} {m.apellidos}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            <label>DNI : </label>
                            {m.dni}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" type="button" onClick={goInit}>
                  <ArrowLeft></ArrowLeft>
                  Inicio
                </Button>
                <Button variant="ghost" type="button" onClick={limpiar}>
                  Limpiar selección
                </Button>
                <Button variant="ghost" type="button" onClick={goNext}>
                  Continuar
                  <ArrowRight></ArrowRight>
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <AgregarBomberos />
    </Suspense>
  )
}
