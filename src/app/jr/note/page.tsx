// src/app/jr/note/page.tsx
'use client'

import { useEffect, useState, useMemo, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogTitleUI,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'

type BomberoItem = { dni: string; nombre: string; apellidos: string }

type Anotacion = {
  users_id: string
  fecha: string
  codigo: string
  hora_entrada: string
  hora_salida: string
  horas_extras: number
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
const CODIGOS_PERMITIDOS = ['JR', 'TH', 'TC', 'V', 'AP', 'B'] as const

function legacyListaKey(ctx: JRContext | null): string | null {
  if (!ctx) return null
  const base = ctx.tipo === 'unidad' ? `unidad:${ctx.unidad_id}` : `caseta:${ctx.caseta_id}`
  return `jr.bomberos.${ctx.zona}.${base}`
}

function NoteJR() {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()

  const urlTipo = params.get('tipo') as 'unidad' | 'caseta' | null
  const urlZona = params.get('zona')
  const urlMunicipio = params.get('municipio')
  const urlUnidad = params.get('unidad')
  const urlCaseta = params.get('caseta')
  const urlUnidadId = params.get('unidad_id')
  const urlCasetaId = params.get('caseta_id')
  const urlLs = params.get('ls')

  const [ctx, setCtx] = useState<JRContext | null | undefined>(undefined)

  useEffect(() => {
    const resolve = async () => {
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
        if (raw) {
          setCtx(JSON.parse(raw) as JRContext)
          return
        }
      } catch {}
      try {
        const res = await fetch('/api/jr/destino', { credentials: 'include' })
        if (res.ok) {
          const djson = await res.json()
          const fallback: JRContext =
            djson.tipo === 'unidad'
              ? {
                  tipo: 'unidad',
                  zona: djson.zona,
                  unidad: djson.unidad_nombre,
                  unidad_id: djson.unidad_id,
                }
              : {
                  tipo: 'caseta',
                  zona: djson.zona,
                  municipio: djson.municipio_nombre,
                  caseta: djson.caseta_nombre,
                  caseta_id: djson.caseta_id,
                }
          setCtx(fallback)
          try {
            localStorage.setItem(CTX_KEY, JSON.stringify(fallback))
          } catch {}
          return
        }
      } catch {}
      setCtx(null)
    }
    resolve()
  }, [urlTipo, urlZona, urlMunicipio, urlUnidad, urlCaseta, urlUnidadId, urlCasetaId, urlLs])

  const { storageKey, anotStorageKey, legacyKey } = useMemo(() => {
    if (!ctx) return { storageKey: null, anotStorageKey: null, legacyKey: null }
    const parte =
      ctx.tipo === 'unidad'
        ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
        : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`
    return {
      storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
      anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
      legacyKey: legacyListaKey(ctx),
    }
  }, [ctx])

  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null)
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal de confirmación (reemplazo)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const payloadRef = useRef<Anotacion[] | null>(null)

  // Cargar lista de bomberos
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        setBomberos(JSON.parse(raw) as BomberoItem[])
        return
      }
      if (legacyKey) {
        const legacyRaw = localStorage.getItem(legacyKey)
        if (legacyRaw) {
          const arr = JSON.parse(legacyRaw) as BomberoItem[]
          setBomberos(arr)
          localStorage.setItem(storageKey, legacyRaw)
          return
        }
      }
      setBomberos([])
    } catch {
      setBomberos([])
    }
  }, [storageKey, legacyKey])

  // Fecha del día (informativa y única)
  const fechaDia: string = useMemo(() => {
    for (const dni in anotaciones) {
      const f = anotaciones[dni]?.fecha
      if (f) return f
    }
    return new Date().toISOString().split('T')[0]
  }, [anotaciones])

  // Inicializar/recuperar anotaciones
  useEffect(() => {
    if (!bomberos) return
    if (!anotStorageKey) return
    try {
      const raw = localStorage.getItem(anotStorageKey)
      if (raw) {
        setAnotaciones(JSON.parse(raw))
        return
      }
    } catch {}
    const hoy = new Date().toISOString().split('T')[0]
    const base: Record<string, Anotacion> = {}
    bomberos.forEach((b) => {
      base[b.dni] = {
        users_id: '',
        fecha: hoy,
        codigo: 'JR',
        hora_entrada: '08:00',
        hora_salida: '15:00',
        horas_extras: 0,
      }
    })
    setAnotaciones(base)
  }, [bomberos, anotStorageKey])

  // Resolver users_id por DNI
  useEffect(() => {
    if (!bomberos || bomberos.length === 0) return
    let cancelled = false
    ;(async () => {
      const updates: Record<string, { users_id: string }> = {}
      for (const b of bomberos) {
        try {
          const res = await fetch(`/api/usuarios/dni?dni=${encodeURIComponent(b.dni)}`, {
            credentials: 'include',
          })
          if (res.ok) {
            const user = await res.json()
            updates[b.dni] = { users_id: user.id }
          }
        } catch {}
      }
      if (cancelled) return
      const today = new Date().toISOString().split('T')[0]
      setAnotaciones((prev) => {
        const next = { ...prev }
        for (const b of bomberos) {
          if (!next[b.dni]) {
            next[b.dni] = {
              users_id: '',
              fecha: today,
              codigo: 'JR',
              hora_entrada: '08:00',
              hora_salida: '15:00',
              horas_extras: 0,
            }
          } else {
            next[b.dni].fecha = today
          }
          if (updates[b.dni]?.users_id) next[b.dni].users_id = updates[b.dni].users_id
        }
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [bomberos])

  // Persistir anotaciones en localStorage
  useEffect(() => {
    try {
      if (anotStorageKey) localStorage.setItem(anotStorageKey, JSON.stringify(anotaciones))
    } catch {}
  }, [anotaciones, anotStorageKey])

  const handleChange = (dni: string, field: keyof Anotacion, value: string | number) => {
    if (field === 'fecha') return
    setAnotaciones((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || {
          users_id: '',
          fecha: fechaDia,
          codigo: 'JR',
          hora_entrada: '08:00',
          hora_salida: '15:00',
          horas_extras: 0,
        }),
        [field]: value,
      },
    }))
  }

  // helpers de reemplazo seguro
  async function postAnotaciones(payload: Anotacion[], opts?: { replace?: boolean }) {
    const url = opts?.replace ? '/api/jr/anotaciones?replace=1' : '/api/jr/anotaciones'
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function replaceViaDeleteThenPost(payload: Anotacion[]) {
    const users = payload.map((p) => p.users_id)
    await fetch(`/api/jr/anotaciones?fecha=${encodeURIComponent(fechaDia)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users_ids: users }),
    }).catch(() => {})
    return postAnotaciones(payload, { replace: true })
  }

  // 1) Preparar payload y abrir modal
  const guardarAnotacionesAhora = async () => {
    setMsg(null)
    // Construir payload (sin guardar aún)
    const porUsuario = new Map<string, Anotacion>()
    ;(bomberos || []).forEach((b) => {
      const a = anotaciones[b.dni]
      if (!a || !a.users_id) return
      porUsuario.set(a.users_id, {
        users_id: a.users_id,
        fecha: fechaDia,
        codigo: a.codigo || 'JR',
        hora_entrada: a.hora_entrada || '08:00',
        hora_salida: a.hora_salida || '15:00',
        horas_extras:
          typeof a.horas_extras === 'number'
            ? a.horas_extras
            : parseFloat(String(a.horas_extras || 0)) || 0,
      })
    })
    const payload = Array.from(porUsuario.values())

    if (payload.length === 0) {
      setMsg('No hay anotaciones válidas para guardar.')
      return
    }

    payloadRef.current = payload
    setConfirmOpen(true)
  }

  // 2) Confirmar modal → reemplazar
  const onConfirmReplace = async () => {
    if (!payloadRef.current) {
      setConfirmOpen(false)
      return
    }
    setConfirmLoading(true)
    setSaving(true)
    try {
      let res = await postAnotaciones(payloadRef.current, { replace: true })
      if (!res.ok) {
        res = await replaceViaDeleteThenPost(payloadRef.current)
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(json.error || 'Error al guardar las anotaciones.')
        toast({
          title: 'No se pudo guardar',
          description: json.error || 'Inténtalo de nuevo.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Anotaciones guardadas',
          description: `Se guardaron ${json.inserted ?? payloadRef.current.length} anotaciones correctamente.`,
        })
      }
    } catch {
      setMsg('Error de conexión con el servidor.')
      toast({
        title: 'Sin conexión',
        description: 'No se pudo contactar con el servidor.',
        variant: 'destructive',
      })
    } finally {
      setConfirmLoading(false)
      setSaving(false)
      setConfirmOpen(false)
      payloadRef.current = null
    }
  }

  const irASalidas = () => {
    if (!ctx) return router.push('/jr')
    const sp = new URLSearchParams({
      tipo: ctx.tipo,
      zona: ctx.zona,
      municipio: ctx.municipio || '',
      unidad: ctx.unidad || '',
      caseta: ctx.caseta || '',
      unidad_id: ctx.unidad_id || '',
      caseta_id: ctx.caseta_id || '',
      ls: storageKey || '',
    })
    router.push(`/jr/exit?${sp.toString()}`)
  }

  const volverABomberos = () => {
    if (!ctx) return router.push('/jr/add')
    const sp = new URLSearchParams({
      tipo: ctx.tipo,
      zona: ctx.zona,
      municipio: ctx.municipio || '',
      unidad: ctx.unidad || '',
      caseta: ctx.caseta || '',
      unidad_id: ctx.unidad_id || '',
      caseta_id: ctx.caseta_id || '',
      ls: storageKey || '',
    })
    router.push(`/jr/add?${sp.toString()}`)
  }

  if (ctx === undefined) {
    return (
      <main className="min-h-dvh w-full grid place-items-center p-4">
        <div className="text-sm text-muted-foreground">Cargando contexto…</div>
      </main>
    )
  }

  if (ctx === null) {
    return (
      <main className="min-h-dvh w-full grid place-items-center p-4">
        <div className="text-sm text-muted-foreground">
          No hay unidad o caseta seleccionada
          <Button className="ml-2" onClick={() => router.push('/jr')}>
            Ir a Inicio
          </Button>
        </div>
      </main>
    )
  }

  const listaCargando = bomberos === null

  return (
    <main className="min-h-dvh w-full p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex gap-2 mb-2">
          <Button
            variant="ghost"
            className="font-bold border-2 border-lime-50"
            onClick={volverABomberos}
          >
            Bomberos
          </Button>
          <Button variant="ghost" className="font-bold border-2 border-lime-50">
            Diario
          </Button>
          <Button
            variant="ghost"
            className="font-bold border-2 border-lime-50"
            onClick={irASalidas}
          >
            Salidas
          </Button>
        </div>

        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="font-black text-2xl">Anotaciones del día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {listaCargando ? (
              <p className="text-xl font-semibold text-muted-foreground">Cargando lista…</p>
            ) : (bomberos || []).length === 0 ? (
              <div className="text-xl font-semibold text-muted-foreground">
                No hay componentes seleccionados en esta unidad/caseta.
                <Button className="ml-2" onClick={volverABomberos}>
                  Seleccionar bomberos
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl">
                  <div className="hidden md:grid grid-cols-[minmax(110px,150px)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(150px,170px)_minmax(110px,130px)_minmax(120px,140px)_minmax(120px,140px)_minmax(120px,150px)] gap-2 bg-muted text-left text-sm font-bold px-2 py-2">
                    <div>DNI</div>
                    <div>Nombre</div>
                    <div>Apellidos</div>
                    <div>Fecha</div>
                    <div>Código</div>
                    <div>Entrada</div>
                    <div>Salida</div>
                    <div>Horas extras</div>
                  </div>

                  <div className="divide-y">
                    {(bomberos || []).map((b) => {
                      const a = anotaciones[b.dni]
                      const fechaMostrar = a?.fecha || fechaDia
                      return (
                        <div
                          key={b.dni}
                          className="grid gap-2 px-2 py-3 grid-cols-1
                                     md:grid-cols-[minmax(110px,150px)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(150px,170px)_minmax(110px,130px)_minmax(120px,140px)_minmax(120px,140px)_minmax(120px,150px)]
                                     md:items-center"
                        >
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              DNI
                            </label>
                            <div className="text-2xl font-bold md:text-sm md:font-normal">
                              {b.dni}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Nombre
                            </label>
                            <div className="text-2xl font-black md:text-sm md:font-normal">
                              {b.nombre}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Apellidos
                            </label>
                            <div className="text-xl font-bold md:text-sm md:font-normal">
                              {b.apellidos}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Fecha
                            </label>
                            <div
                              className="px-2 py-1 border rounded bg-background text-xl font-bold md:text-sm md:font-normal"
                              aria-label="Fecha del día"
                            >
                              {fechaMostrar}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Código de trabajo
                            </label>
                            <select
                              className="w-full border rounded px-2 py-1 text-sm bg-background"
                              value={a?.codigo || 'JR'}
                              onChange={(e) => handleChange(b.dni, 'codigo', e.target.value)}
                              aria-label="Código de trabajo"
                            >
                              {CODIGOS_PERMITIDOS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Entrada
                            </label>
                            <Input
                              type="time"
                              value={a?.hora_entrada || ''}
                              onChange={(e) => handleChange(b.dni, 'hora_entrada', e.target.value)}
                              aria-label="Hora de entrada"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Salida
                            </label>
                            <Input
                              type="time"
                              value={a?.hora_salida || ''}
                              onChange={(e) => handleChange(b.dni, 'hora_salida', e.target.value)}
                              aria-label="Hora de salida"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Horas extras
                            </label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.25"
                              min="0"
                              className="w-24 text-right"
                              value={a?.horas_extras ?? 0}
                              onChange={(e) =>
                                handleChange(
                                  b.dni,
                                  'horas_extras',
                                  e.target.value ? parseFloat(e.target.value) : 0,
                                )
                              }
                              aria-label="Horas extras"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {msg && (
                  <Alert variant="destructive">
                    <AlertTitle className="font-bold text-lg">Error</AlertTitle>
                    <AlertDescription className="text-base">{msg}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    className="font-bold border-2 border-lime-50"
                    onClick={volverABomberos}
                  >
                    Atrás
                  </Button>
                  <Button
                    className="font-bold border-2 border-lime-50"
                    onClick={guardarAnotacionesAhora}
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : 'Guardar diario '}
                  </Button>
                  <Button className="font-bold border-2 border-lime-50" onClick={irASalidas}>
                    Siguiente: Salidas
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmación (shadcn/radix) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitleUI className="font-black">Reemplazar anotación del día</DialogTitleUI>
            <DialogDescription className="text-base">
              Se guardará el diario de <b>{fechaDia}</b> sobrescribiendo la anotación existente (si
              la hubiera) para los usuarios seleccionados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={confirmLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="font-bold border-2 border-lime-50"
              onClick={onConfirmReplace}
              disabled={confirmLoading}
            >
              {confirmLoading ? 'Reemplazando…' : 'Reemplazar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <NoteJR />
    </Suspense>
  )
}
