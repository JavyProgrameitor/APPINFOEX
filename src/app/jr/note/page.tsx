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

// Defaults
const DEFAULTS = {
  codigo: 'JR',
  hora_entrada: '08:00',
  hora_salida: '15:00',
  horas_extras: 0,
} as const

function legacyListaKey(ctx: JRContext | null): string | null {
  if (!ctx) return null
  const base = ctx.tipo === 'unidad' ? `unidad:${ctx.unidad_id}` : `caseta:${ctx.caseta_id}`
  return `jr.bomberos.${ctx.zona}.${base}`
}

function computeKeys(ctx: JRContext | null) {
  if (!ctx)
    return {
      storageKey: null,
      anotStorageKey: null,
      legacyKey: null,
      anotDraftKey: null,
    }
  const parte =
    ctx.tipo === 'unidad'
      ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
      : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`
  return {
    storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
    anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
    legacyKey: legacyListaKey(ctx),
    anotDraftKey: `INFOEX:anotaciones_draft:${ctx.tipo}:${parte}`,
  }
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
        const res = await fetch('/supabase/jr/destino', { credentials: 'include' })
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

  const { storageKey, anotStorageKey, legacyKey, anotDraftKey } = useMemo(
    () => computeKeys(ctx ?? null),
    [ctx],
  )

  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null)
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({})
  const [uiHorasExtras, setUiHorasExtras] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const payloadRef = useRef<Anotacion[] | null>(null)

  // Lista bomberos
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

  // Fecha visible (informativa)
  const fechaDia: string = useMemo(() => {
    for (const dni in anotaciones) {
      const f = anotaciones[dni]?.fecha
      if (f) return f
    }
    return new Date().toISOString().split('T')[0]
  }, [anotaciones])

  // Cargar anotaciones (draft -> storage -> defaults)
  useEffect(() => {
    if (!bomberos) return
    if (!anotStorageKey) return
    let loaded: Record<string, Anotacion> | null = null
    try {
      if (anotDraftKey) {
        const rawDraft = localStorage.getItem(anotDraftKey)
        if (rawDraft) loaded = JSON.parse(rawDraft) as Record<string, Anotacion>
      }
      if (!loaded) {
        const raw = localStorage.getItem(anotStorageKey)
        if (raw) loaded = JSON.parse(raw) as Record<string, Anotacion>
      }
    } catch {}

    if (loaded) {
      setAnotaciones(loaded)
      const ui: Record<string, string> = {}
      Object.keys(loaded).forEach((dni) => {
        ui[dni] = String(loaded![dni]?.horas_extras ?? DEFAULTS.horas_extras)
      })
      setUiHorasExtras(ui)
      return
    }

    const hoy = new Date().toISOString().split('T')[0]
    const base: Record<string, Anotacion> = {}
    const ui: Record<string, string> = {}
    bomberos.forEach((b) => {
      base[b.dni] = {
        users_id: '',
        fecha: hoy,
        codigo: DEFAULTS.codigo,
        hora_entrada: DEFAULTS.hora_entrada,
        hora_salida: DEFAULTS.hora_salida,
        horas_extras: DEFAULTS.horas_extras,
      }
      ui[b.dni] = String(DEFAULTS.horas_extras)
    })
    setAnotaciones(base)
    setUiHorasExtras(ui)
  }, [bomberos, anotStorageKey, anotDraftKey])

  // Resolver users_id
  useEffect(() => {
    if (!bomberos || bomberos.length === 0) return
    let cancelled = false
    ;(async () => {
      const updates: Record<string, { users_id: string }> = {}
      for (const b of bomberos) {
        try {
          const res = await fetch(`/supabase/usuarios/dni?dni=${encodeURIComponent(b.dni)}`, {
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
        const uiNext: Record<string, string> = { ...uiHorasExtras }
        for (const b of bomberos) {
          if (!next[b.dni]) {
            next[b.dni] = {
              users_id: '',
              fecha: today,
              codigo: DEFAULTS.codigo,
              hora_entrada: DEFAULTS.hora_entrada,
              hora_salida: DEFAULTS.hora_salida,
              horas_extras: DEFAULTS.horas_extras,
            }
            uiNext[b.dni] = String(DEFAULTS.horas_extras)
          } else {
            if (!next[b.dni].fecha) next[b.dni].fecha = today
            if (uiNext[b.dni] === undefined) {
              uiNext[b.dni] = String(next[b.dni].horas_extras ?? DEFAULTS.horas_extras)
            }
          }
          if (updates[b.dni]?.users_id) next[b.dni].users_id = updates[b.dni].users_id
        }
        setUiHorasExtras(uiNext)
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [bomberos, uiHorasExtras])
  // Persistencia
  useEffect(() => {
    try {
      if (anotStorageKey) localStorage.setItem(anotStorageKey, JSON.stringify(anotaciones))
      if (anotDraftKey) localStorage.setItem(anotDraftKey, JSON.stringify(anotaciones))
    } catch {}
  }, [anotaciones, anotStorageKey, anotDraftKey])
  // Handlers
  const handleChange = (dni: string, field: keyof Anotacion, value: string | number) => {
    if (field === 'fecha') return
    setAnotaciones((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || {
          users_id: '',
          fecha: fechaDia,
          codigo: DEFAULTS.codigo,
          hora_entrada: DEFAULTS.hora_entrada,
          hora_salida: DEFAULTS.hora_salida,
          horas_extras: DEFAULTS.horas_extras,
        }),
        [field]: value,
      },
    }))
  }
  const onHorasChange = (dni: string, raw: string) => {
    setUiHorasExtras((prev) => ({ ...prev, [dni]: raw }))
  }
  const onHorasBlur = (dni: string) => {
    const raw = uiHorasExtras[dni]
    const num = raw === '' ? 0 : parseFloat(raw.replace(',', '.'))
    const safe = isFinite(num) ? Math.max(0, num) : 0
    setAnotaciones((prev) => ({
      ...prev,
      [dni]: { ...(prev[dni] as Anotacion), horas_extras: safe },
    }))
    setUiHorasExtras((prev) => ({ ...prev, [dni]: String(safe) }))
  }
  const onHorasStep = (dni: string, newVal: string) => {
    setUiHorasExtras((prev) => ({ ...prev, [dni]: newVal }))
    const num = parseFloat(newVal)
    if (isFinite(num)) {
      setAnotaciones((prev) => ({
        ...prev,
        [dni]: { ...(prev[dni] as Anotacion), horas_extras: num },
      }))
    }
  }
  // API
  async function postAnotaciones(payload: Anotacion[], opts?: { replace?: boolean }) {
    const url = opts?.replace ? '/supabase/jr/anotaciones?replace=1' : '/supabase/jr/anotaciones'
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function replaceViaDeleteThenPost(payload: Anotacion[]) {
    const users = payload.map((p) => p.users_id)
    await fetch(`/supabase/jr/anotaciones?fecha=${encodeURIComponent(fechaDia)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users_ids: users }),
    }).catch(() => {})
    return postAnotaciones(payload, { replace: true })
  }

  const guardarAnotacionesAhora = async () => {
    setMsg(null)
    const porUsuario = new Map<string, Anotacion>()
    ;(bomberos || []).forEach((b) => {
      const a = anotaciones[b.dni]
      if (!a || !a.users_id) return
      const ui = uiHorasExtras[b.dni]
      const hx =
        ui === ''
          ? 0
          : isFinite(parseFloat((ui || '').replace(',', '.')))
            ? parseFloat((ui || '').replace(',', '.'))
            : 0
      porUsuario.set(a.users_id, {
        users_id: a.users_id,
        fecha: fechaDia,
        codigo: a.codigo || DEFAULTS.codigo,
        hora_entrada: a.hora_entrada || DEFAULTS.hora_entrada,
        hora_salida: a.hora_salida || DEFAULTS.hora_salida,
        horas_extras: Math.max(0, hx),
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
        try {
          if (anotDraftKey) localStorage.removeItem(anotDraftKey)
        } catch {}
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
    const { storageKey } = computeKeys(ctx)
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
    const { storageKey } = computeKeys(ctx)
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
  // Render
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
  const isTouched = (a?: Anotacion) => {
    if (!a) return false
    return (
      a.codigo !== DEFAULTS.codigo ||
      a.hora_entrada !== DEFAULTS.hora_entrada ||
      a.hora_salida !== DEFAULTS.hora_salida ||
      Number(a.horas_extras || 0) !== DEFAULTS.horas_extras
    )
  }

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

        <Card className="shadow-xl rounded-2xl shadow-accent">
          <CardHeader className="space-y-2">
            <CardTitle className="text-center font-black text-2xl">Control Diario</CardTitle>
            <span className="font-black text-primary text-center text-xl">Fecha:{fechaDia}</span>
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
                <div className="overflow-x-auto rounded-2xl text-center cursor-pointer">
                  {/* Encabezado */}
                  <div className="hidden lg:grid grid-cols-7 gap-3 bg-muted text-left text-sm font-bold px-2 py-2 rounded-xl">
                    <div>DNI</div>
                    <div>Nombre</div>
                    <div>Apellidos</div>
                    <div>Código</div>
                    <div>Entrada</div>
                    <div>Salida</div>
                    <div>Horas extras</div>
                  </div>
                  {/* Filas */}
                  <div className="space-y-1 mt-2 lg:space-y-2">
                    {(bomberos || []).map((b) => {
                      const a = anotaciones[b.dni]
                      const touched = isTouched(a)
                      const uiHX =
                        uiHorasExtras[b.dni] ?? String(a?.horas_extras ?? DEFAULTS.horas_extras)

                      return (
                        <div
                          key={b.dni}
                          className={[
                            'grid gap-2 px-2 py-3 rounded-xl border transition',
                            'lg:grid-cols-7 lg:items-center',
                            touched
                              ? 'bg-muted/50 dark:bg-muted/30 border-primary/50 ring-1 ring-primary/25'
                              : 'bg-background hover:bg-muted/40 border-muted/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40',
                          ].join(' ')}
                        >
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              DNI
                            </label>
                            <div className="text-2xl font-black lg:text-sm lg:font-medium">
                              {b.dni}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Nombre
                            </label>
                            <div className="text-2xl font-black lg:text-sm lg:font-medium">
                              {b.nombre}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Apellidos
                            </label>
                            <div className="text-2xl font-black lg:text-sm lg:font-medium">
                              {b.apellidos}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Código de trabajo
                            </label>
                            <select
                              // en móvil ocupa todo, en escritorio lo limitamos
                              className="lg:w-12 xl:w-24 border rounded px-2 py-1 text-sm bg-background h-9 m-1"
                              value={a?.codigo ?? DEFAULTS.codigo}
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
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Entrada
                            </label>
                            <Input
                              type="time"
                              className="h-9 text-sm"
                              value={a?.hora_entrada ?? DEFAULTS.hora_entrada}
                              onChange={(e) => handleChange(b.dni, 'hora_entrada', e.target.value)}
                              aria-label="Hora de entrada"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Salida
                            </label>
                            <Input
                              type="time"
                              className="h-9 text-sm"
                              value={a?.hora_salida ?? DEFAULTS.hora_salida}
                              onChange={(e) => handleChange(b.dni, 'hora_salida', e.target.value)}
                              aria-label="Hora de salida"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="lg:hidden text-lg font-bold text-muted-foreground">
                              Horas extras
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              step={0.25}
                              min={0}
                              // ancho contenido y sin márgenes que lo saquen fuera
                              className="w-14 lg:w-16 xl:w-20 rounded border px-2 py-1 text-right text-sm bg-background appearance-auto h-9 m-1"
                              value={uiHX}
                              onChange={(e) => {
                                const v = e.target.value
                                if (
                                  v !== '' &&
                                  e.nativeEvent instanceof InputEvent &&
                                  e.nativeEvent.inputType === 'insertReplacementText'
                                ) {
                                  onHorasStep(b.dni, v)
                                } else {
                                  onHorasChange(b.dni, v)
                                }
                              }}
                              onBlur={() => onHorasBlur(b.dni)}
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
                    className="font-bold border-2 border-lime-50 cursor-pointer transition-colors hover:bg-lime-200 hover:text-lime-900"
                    onClick={volverABomberos}
                  >
                    Atrás
                  </Button>

                  <Button
                    className="font-bold border-2 border-lime-50 cursor-pointer transition-colors hover:bg-lime-200 hover:text-lime-900"
                    onClick={guardarAnotacionesAhora}
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : 'Guardar diario '}
                  </Button>

                  <Button
                    className="font-bold border-2 border-lime-50 cursor-pointer transition-colors hover:bg-lime-200 hover:text-lime-900"
                    onClick={irASalidas}
                  >
                    Siguiente: Salidas
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Modal de confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitleUI className="font-black">Guardar anotación del día</DialogTitleUI>
            <DialogDescription className="text-base">
              Se guardará el diario de <b>{fechaDia}</b> Guardando en la anotación existente (si la
              hubiera) para los usuarios seleccionados.
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
              {confirmLoading ? 'Insertando....' : 'Insertar ahora'}
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
