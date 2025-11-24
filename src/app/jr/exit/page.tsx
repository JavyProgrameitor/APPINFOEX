// src/app/jr/exit/page.tsx
'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Use-toast'
import { ArrowLeft, DoorOpen } from 'lucide-react'

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
type SalidaLinea = {
  tipo: 'Extincion' | 'Prevencion'
  hora_salida: string
  hora_entrada: string
  lugar: string
  num_intervienen: number
}

const CTX_KEY = 'INFOEX:jr:ctx'
const TIPOS_SALIDA = ['Extincion', 'Prevencion'] as const

const DEFAULT_SALIDA: SalidaLinea = {
  tipo: 'Extincion',
  hora_salida: '15:00',
  hora_entrada: '08:00',
  lugar: '',
  num_intervienen: 0,
}

const isTouched = (s: SalidaLinea) =>
  s.tipo !== DEFAULT_SALIDA.tipo ||
  s.hora_salida !== DEFAULT_SALIDA.hora_salida ||
  s.hora_entrada !== DEFAULT_SALIDA.hora_entrada ||
  (s.lugar ?? '').trim() !== '' ||
  Number(s.num_intervienen || 0) !== 0

function computeKeys(ctx: JRContext | null) {
  if (!ctx) {
    return {
      storageKey: null,
      anotStorageKey: null,
      metaStorageKey: null,
      salidasDraftKey: null,
    }
  }
  const parte =
    ctx.tipo === 'unidad'
      ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
      : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`

  return {
    storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
    anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
    metaStorageKey: `INFOEX:meta:${ctx.tipo}:${parte}`,
    salidasDraftKey: `INFOEX:salidas_draft:${ctx.tipo}:${parte}`,
  }
}

function ExitJR() {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()

  const [ctx, setCtx] = useState<JRContext | null>(null)
  useEffect(() => {
    const urlTipo = params.get('tipo') as 'unidad' | 'caseta' | null
    const urlZona = params.get('zona')
    const urlMunicipio = params.get('municipio')
    const urlUnidad = params.get('unidad')
    const urlCaseta = params.get('caseta')
    const urlUnidadId = params.get('unidad_id')
    const urlCasetaId = params.get('caseta_id')
    const urlLs = params.get('ls')
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
    setCtx(null)
  }, [params])

  const { storageKey, anotStorageKey, metaStorageKey, salidasDraftKey } = useMemo(
    () => computeKeys(ctx),
    [ctx],
  )

  const [bomberos, setBomberos] = useState<BomberoItem[]>([])
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({})
  const [salidas, setSalidas] = useState<SalidaLinea[]>([{ ...DEFAULT_SALIDA }])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setBomberos(parsed)
      }
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (!anotStorageKey) return
    try {
      const raw = localStorage.getItem(anotStorageKey)
      if (raw) setAnotaciones(JSON.parse(raw) as Record<string, Anotacion>)
    } catch {}
  }, [anotStorageKey])

  // Cargar borrador local
  useEffect(() => {
    if (!salidasDraftKey) return
    try {
      const raw = localStorage.getItem(salidasDraftKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length) setSalidas(parsed)
      }
    } catch {}
  }, [salidasDraftKey])

  // Guardar borrador en cada cambio
  useEffect(() => {
    if (!salidasDraftKey) return
    try {
      localStorage.setItem(salidasDraftKey, JSON.stringify(salidas))
    } catch {}
  }, [salidas, salidasDraftKey])

  const totalBomberos = bomberos.length
  const fecha = (() => {
    for (const b of bomberos) {
      const a = anotaciones[b.dni]
      if (a?.fecha) return a.fecha
    }
    return new Date().toISOString().split('T')[0]
  })()

  const users_ids = bomberos.map((b) => anotaciones[b.dni]?.users_id).filter(Boolean) as string[]

  const addSalida = () => setSalidas((prev) => [...prev, { ...DEFAULT_SALIDA }])
  const removeSalida = (idx: number) => setSalidas((prev) => prev.filter((_, i) => i !== idx))
  const changeSalida = <K extends keyof SalidaLinea>(
    idx: number,
    field: K,
    value: SalidaLinea[K],
  ) => setSalidas((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))

  const volverAAnotaciones = () => {
    if (!ctx) return router.push('/jr/note')
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
    router.push(`/jr/note?${sp.toString()}`)
  }

  const guardarSalidas = async () => {
    setMsg(null)
    setLoading(true)
    try {
      const salidasPayload = salidas
        .map((s) => ({
          tipo: (s.tipo || 'Prevencion') as 'Extincion' | 'Prevencion',
          hora_salida: s.hora_salida || DEFAULT_SALIDA.hora_salida,
          hora_entrada: s.hora_entrada || DEFAULT_SALIDA.hora_entrada,
          lugar: s.lugar || '',
          num_intervienen: Math.max(
            0,
            Math.min(parseInt(String(s.num_intervienen || '0'), 10) || 0, totalBomberos),
          ),
        }))
        .filter((s) => s.num_intervienen > 0)

      if (salidasPayload.length === 0) {
        setMsg('No hay salidas válidas (no hay numeros de Bomberos).')
        setLoading(false)
        return
      }

      const res = await fetch('/supabase/jr/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, users_ids, salidas: salidasPayload }),
      })

      const json = await res.json()
      if (!res.ok) {
        setMsg(json.error || 'Error al guardar las salidas.')
        toast({
          title: 'No se pudo guardar',
          description: json.error || 'Inténtalo de nuevo.',
          variant: 'destructive',
        })
      } else {
        try {
          if (salidasDraftKey) localStorage.removeItem(salidasDraftKey)
        } catch {}

        if (metaStorageKey) {
          try {
            const raw = localStorage.getItem(metaStorageKey)
            const prev = raw ? JSON.parse(raw) : {}
            localStorage.setItem(
              metaStorageKey,
              JSON.stringify({
                ...prev,
                synced_at: new Date().toISOString(),
                salidas: (prev.salidas || 0) + (json.inserted_salidas ?? 0),
              }),
            )
          } catch {}
        }
        toast({
          title: 'Salidas guardadas',
          description: `Se guardaron ${json.inserted_salidas ?? 0} salidas correctamente.`,
        })
        router.push('/jr')
      }
    } catch {
      setMsg('Error de conexión con el servidor.')
      toast({
        title: 'Sin conexión',
        description: 'No se pudo contactar con el servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (ctx === null) {
    return (
      <main className="min-h-dvh w-full grid place-items-center p-4">
        <div className="text-sm font-medium text-muted-foreground">
          No hay contexto de JR. Ve a la selección.
          <Button
            className="ml-2 font-bold border-2 border-lime-50"
            onClick={() => router.push('/jr')}
          >
            Ir a JR
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh w-full p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="rounded-2xl shadow-accent">
          <CardHeader className="flex items-center justify-center">
            <DoorOpen></DoorOpen>
            <CardTitle className="text-center text-animate text-2xl font-black">
              Salidas del día: <b className="text-center text-xl">{fecha}</b>
            </CardTitle>
          </CardHeader>
          <CardContent className="rounded-2xl">
            <div className="rounded-2xl cursor-pointer">
              {/* Filas (siempre como cards, en todas las vistas) */}
              <div className="space-y-1 mt-2 lg:space-y-2">
                {salidas.map((s, idx) => {
                  const touched = isTouched(s)
                  return (
                    <div
                      key={idx}
                      className={[
                        'px-2 py-3 rounded-xl border transition space-y-2',
                        touched
                          ? 'bg-muted/50 dark:bg-muted/30 border-primary/50 ring-1 ring-primary/25'
                          : 'bg-background hover:bg-muted/40 dark:hover:bg-muted/20 border-border hover:border-primary/30 focus-within:ring-1 focus-within:ring-primary/30',
                      ].join(' ')}
                    >
                      {/* Layout tipo card en todas las resoluciones */}
                      <div className="grid gap-2 text-center">
                        {/* Tipo */}
                        <div className="gap-3">
                          <label className="text-lg font-bold text-muted-foreground">Tipo</label>
                          <select
                            className="border-8 shadow-2xl shadow-accent m-1"
                            value={s.tipo}
                            onChange={(e) =>
                              changeSalida(
                                idx,
                                'tipo',
                                e.target.value as 'Extincion' | 'Prevencion',
                              )
                            }
                            aria-label="Tipo de salida"
                          >
                            {TIPOS_SALIDA.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Hora salida */}
                        <div className="space-y-1">
                          <label className="text-lg font-bold text-muted-foreground">
                            Hora salida
                          </label>
                          <Input
                            type="time"
                            className="h-9 text-sm  lg:w-24"
                            value={s.hora_salida}
                            onChange={(e) => changeSalida(idx, 'hora_salida', e.target.value)}
                            aria-label="Hora de salida"
                          />
                        </div>

                        {/* Hora entrada */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-lg font-bold text-muted-foreground">
                            Hora entrada
                          </label>
                          <Input
                            type="time"
                            className="h-9 text-sm lg:w-24"
                            value={s.hora_entrada}
                            onChange={(e) => changeSalida(idx, 'hora_entrada', e.target.value)}
                            aria-label="Hora de entrada"
                          />
                        </div>

                        {/* Nº intervinientes */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-lg font-bold text-muted-foreground">
                            Bomberos que intervienen:<p className="text-animate">{totalBomberos}</p>
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-18 lg:w-20 text-right border rounded-2xl px-2 py-1 text-sm bg-background m-2 h-9"
                            value={String(s.num_intervienen)}
                            onChange={(e) => {
                              const raw = e.currentTarget.value.replace(/\D+/g, '')
                              const n = raw === '' ? 0 : parseInt(raw, 10)
                              const safe = isFinite(n) ? Math.max(0, Math.min(n, totalBomberos)) : 0
                              changeSalida(idx, 'num_intervienen', safe)
                            }}
                            aria-label="Número de intervinientes"
                          />
                        </div>

                        {/* Zona intervención (siempre visible) */}
                        <div className="space-y-1 text-center">
                          <label className="text-lg font-bold text-muted-foreground lg:text-sm">
                            Zona de intervención
                          </label>
                          <Input
                            placeholder="Zona de intervención"
                            className="w-48 h-9 text-sm lg:h-10"
                            value={s.lugar}
                            onChange={(e) => changeSalida(idx, 'lugar', e.target.value)}
                            aria-label="Lugar"
                          />
                        </div>

                        {/* Botones */}
                        <div className="flex items-center justify-center gap-3">
                          <Button variant="ghost" onClick={addSalida}>
                            Añadir
                          </Button>
                          <Button variant="ghost" onClick={guardarSalidas} disabled={loading}>
                            {loading ? 'Guardando…' : 'Guardar salida'}
                          </Button>
                          <Button variant="ghost" onClick={() => removeSalida(idx)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {msg && (
              <Alert variant="destructive">
                <AlertTitle className="font-black text-lg">Atención</AlertTitle>
                <AlertDescription className="text-base font-semibold">{msg}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-center m-3">
              <Button variant="ghost" onClick={volverAAnotaciones}>
                <ArrowLeft></ArrowLeft>
                Atrás
              </Button>
            </div>
          </CardContent>
        </Card>
        {metaStorageKey ? (
          <small className="text-xs text-muted-foreground">
            Última subida en este dispositivo{' '}
            {(() => {
              try {
                const raw =
                  typeof window !== 'undefined' ? localStorage.getItem(metaStorageKey) : null
                if (!raw) return '—'
                const m = JSON.parse(raw)
                return `${m.synced_at ?? '—'} (salidas acumuladas: ${m.salidas ?? 0})`
              } catch {
                return '—'
              }
            })()}
          </small>
        ) : null}
      </div>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <ExitJR />
    </Suspense>
  )
}
