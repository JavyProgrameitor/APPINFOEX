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

// Defaults para comparar cambios (resaltado visual)
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
  if (!ctx) return { storageKey: null, anotStorageKey: null, legacyKey: null, anotDraftKey: null }
  const parte =
    ctx.tipo === 'unidad'
      ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
      : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`
  return {
    storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
    anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
    legacyKey: legacyListaKey(ctx),
    // NUEVO: borrador local para no perder al navegar
    anotDraftKey: `INFOEX:anotaciones_draft:${ctx.tipo}:${parte}`,
  }
}

function NoteJR() {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()

  // --- Contexto JR -----------------------------------------------------------
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

  const { storageKey, anotStorageKey, legacyKey, anotDraftKey } = useMemo(
    () => computeKeys(ctx ?? null),
    [ctx],
  )

  // --- Estado principal ------------------------------------------------------
  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null)
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({})
  const [uiHorasExtras, setUiHorasExtras] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal confirmación
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const payloadRef = useRef<Anotacion[] | null>(null)

  // --- Cargar lista de bomberos (para filas y users_id) ----------------------
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

  // Fecha visible (toma la primera disponible)
  const fechaDia: string = useMemo(() => {
    for (const dni in anotaciones) {
      const f = anotaciones[dni]?.fecha
      if (f) return f
    }
    return new Date().toISOString().split('T')[0]
  }, [anotaciones])

  // --- Inicializar/rehidratar anotaciones (DRAFT -> STORAGE -> DEFAULTS) ----
  useEffect(() => {
    if (!bomberos) return
    if (!anotStorageKey) return
    let loaded: Record<string, Anotacion> | null = null
    try {
      // 1) Preferimos el borrador si existe (lo último que escribió el usuario)
      if (anotDraftKey) {
        const rawDraft = localStorage.getItem(anotDraftKey)
        if (rawDraft) loaded = JSON.parse(rawDraft) as Record<string, Anotacion>
      }
      // 2) Si no hay borrador, usamos el almacenamiento "oficial" local
      if (!loaded) {
        const raw = localStorage.getItem(anotStorageKey)
        if (raw) loaded = JSON.parse(raw) as Record<string, Anotacion>
      }
    } catch {}

    if (loaded) {
      setAnotaciones(loaded)
      // hidratar UI de horas extras
      const ui: Record<string, string> = {}
      Object.keys(loaded).forEach((dni) => {
        ui[dni] = String(loaded![dni]?.horas_extras ?? DEFAULTS.horas_extras)
      })
      setUiHorasExtras(ui)
      return
    }

    // 3) Si no había nada, generamos base por defecto solo una vez
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

  // --- Resolver users_id por DNI (sin pisar campos existentes) --------------
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
        const uiNext: Record<string, string> = { ...uiHorasExtras }
        for (const b of bomberos) {
          // Si no existe la anotación, crearla con defaults
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
            // Si existe, NO pisamos sus valores actuales (ni fecha, ni horas, etc.)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomberos])

  // --- Persistir: oficial + borrador (para no perder al navegar) ------------
  useEffect(() => {
    try {
      if (anotStorageKey) localStorage.setItem(anotStorageKey, JSON.stringify(anotaciones))
      if (anotDraftKey) localStorage.setItem(anotDraftKey, JSON.stringify(anotaciones))
    } catch {}
  }, [anotaciones, anotStorageKey, anotDraftKey])

  // --- Handlers de UI --------------------------------------------------------
  const handleChange = (dni: string, field: keyof Anotacion, value: string | number) => {
    if (field === 'fecha') return // la fecha es global (arriba)
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

  // Horas extras: permitir escribir vacío y normalizar en blur
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

  // --- API helpers -----------------------------------------------------------
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

  // --- Guardado con confirmación --------------------------------------------
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
        // Limpia el borrador solo tras guardar OK
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

  // --- Navegación ------------------------------------------------------------
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

  // --- Render ---------------------------------------------------------------
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

        <Card className="shadow-xl rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="font-black text-2xl">Anotaciones del día</CardTitle>
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded-lg bg-muted text-foreground/90">
                Fecha:&nbsp;<b>{fechaDia}</b>
              </span>
            </div>
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
                  <div className="hidden md:grid grid-cols-[minmax(110px,150px)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(110px,130px)_minmax(120px,140px)_minmax(120px,150px)_minmax(120px,150px)] gap-2 bg-muted text-left text-sm font-bold px-2 py-2 rounded-xl">
                    <div>DNI</div>
                    <div>Nombre</div>
                    <div>Apellidos</div>
                    <div>Código</div>
                    <div>Entrada</div>
                    <div>Salida</div>
                    <div>Horas extras</div>
                  </div>

                  <div className="space-y-2 mt-2">
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
                            'md:grid-cols-[minmax(110px,150px)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(110px,130px)_minmax(120px,140px)_minmax(120px,150px)_minmax(120px,150px)] md:items-center',
                            touched
                              ? 'bg-muted/50 dark:bg-muted/30 border-primary/50 ring-1 ring-primary/25'
                              : 'bg-background hover:bg-muted/40 dark:hover:bg-muted/20 border-border hover:border-primary/30 focus-within:ring-1 focus-within:ring-primary/30',
                          ].join(' ')}
                        >
                          {/* DNI */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              DNI
                            </label>
                            <div className="text-2xl font-bold md:text-sm md:font-medium">
                              {b.dni}
                            </div>
                          </div>

                          {/* Nombre */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Nombre
                            </label>
                            <div className="text-xl font-semibold md:text-sm md:font-medium">
                              {b.nombre}
                            </div>
                          </div>

                          {/* Apellidos */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Apellidos
                            </label>
                            <div className="text-lg font-medium md:text-sm md:font-medium">
                              {b.apellidos}
                            </div>
                          </div>

                          {/* Código */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
                              Código de trabajo
                            </label>
                            <select
                              className="w-full border rounded px-2 py-1 text-sm bg-background h-9"
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

                          {/* Entrada */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
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

                          {/* Salida */}
                          <div className="space-y-1">
                            <label className="md:hidden text-sm font-semibold text-muted-foreground">
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

                          {/* Horas extras */}
                          <div className="space-y-1">
                            <label className="text-sm font-semibold text-muted-foreground">
                              <span className="md:inline">Horas extras</span>
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              step={0.25}
                              min={0}
                              className="w-24 md:w-28 rounded border px-2 py-1 text-right text-sm bg-background [appearance:auto] h-9"
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

      {/* Modal de confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitleUI className="font-black">Guardar anotación del día</DialogTitleUI>
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
