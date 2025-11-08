// src/app/jr/exit/page.tsx
'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Use-toast'

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
const TIPOS_SALIDA = ['Incendio', 'Trabajo'] as const

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

function ExitJR() {
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

  const [ctx, setCtx] = useState<JRContext | null>(null)
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
      if (raw) {
        setCtx(JSON.parse(raw) as JRContext)
        return
      }
    } catch {}
    setCtx(null)
  }, [urlTipo, urlZona, urlMunicipio, urlUnidad, urlCaseta, urlUnidadId, urlCasetaId, urlLs])

  const { storageKey, anotStorageKey, metaStorageKey } = useMemo(() => {
    if (!ctx) return { storageKey: null, anotStorageKey: null, metaStorageKey: null }
    const parte =
      ctx.tipo === 'unidad'
        ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ''}`
        : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ''}/${ctx.caseta || ''}`
    return {
      storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
      anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
      metaStorageKey: `INFOEX:meta:${ctx.tipo}:${parte}`,
    }
  }, [ctx])

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
        setMsg('No hay salidas válidas (nº intervinientes debe ser > 0).')
        setLoading(false)
        return
      }

      const res = await fetch('/api/jr/salidas', {
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
        <div className="text-sm text-muted-foreground">
          No hay contexto de JR. Ve a la selección.
          <Button className="ml-2" onClick={() => router.push('/jr')}>
            Ir a JR
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh w-full p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex gap-2 mb-2">
          <Button
            variant="ghost"
            className="font-bold border-2 border-lime-50"
            onClick={volverAAnotaciones}
          >
            Diario
          </Button>
          <Button variant="ghost" className="font-bold border-2 border-lime-50">
            Salidas
          </Button>
        </div>

        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="font-black text-2xl">Salidas del día</CardTitle>
            <div className="mt-1 text-xl font-semibold text-muted-foreground md:text-xs md:font-normal">
              Fecha: <b>{fecha}</b> — Bomberos disponibles: <b>{totalBomberos}</b>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 rounded-2xl">
            <div className="overflow-x-auto rounded-2xl">
              {/* Cabecera md+ — columna LUGAR flexible sin empujar al resto */}
              <div className="hidden md:grid grid-cols-[minmax(110px,160px)_minmax(110px,160px)_minmax(110px,160px)_minmax(0,1fr)_minmax(110px,170px)_minmax(90px,120px)] gap-2 bg-muted text-left text-sm font-bold px-2 py-2 rounded-xl">
                <div>Tipo</div>
                <div>Hora salida</div>
                <div>Hora entrada</div>
                <div>Lugar</div>
                <div>Nº intervinientes</div>
                <div></div>
              </div>

              {/* Filas con realce igual que en note */}
              <div className="space-y-2 mt-2">
                {salidas.map((s, idx) => {
                  const touched = isTouched(s)
                  return (
                    <div
                      key={idx}
                      className={[
                        'grid gap-2 px-2 py-3 rounded-xl border transition',
                        'md:grid-cols-[minmax(110px,160px)_minmax(110px,160px)_minmax(110px,160px)_minmax(0,1fr)_minmax(110px,170px)_minmax(90px,120px)] md:items-center',
                        touched
                          ? 'bg-muted/50 dark:bg-muted/30 border-primary/50 ring-1 ring-primary/25'
                          : 'bg-background hover:bg-muted/40 dark:hover:bg-muted/20 border-border hover:border-primary/30 focus-within:ring-1 focus-within:ring-primary/30',
                      ].join(' ')}
                    >
                      {/* Tipo */}
                      <div className="space-y-1 min-w-0">
                        <label className="md:hidden text-sm font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm bg-background"
                          value={s.tipo}
                          onChange={(e) =>
                            changeSalida(idx, 'tipo', e.target.value as 'Extincion' | 'Prevencion')
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
                      <div className="space-y-1 min-w-0">
                        <label className="md:hidden text-sm font-semibold text-muted-foreground">
                          Hora salida
                        </label>
                        <Input
                          type="time"
                          className="w-full md:w-28"
                          value={s.hora_salida}
                          onChange={(e) => changeSalida(idx, 'hora_salida', e.target.value)}
                          aria-label="Hora de salida"
                        />
                      </div>

                      {/* Hora entrada */}
                      <div className="space-y-1 min-w-0">
                        <label className="md:hidden text-sm font-semibold text-muted-foreground">
                          Hora entrada
                        </label>
                        <Input
                          type="time"
                          className="w-full md:w-28"
                          value={s.hora_entrada}
                          onChange={(e) => changeSalida(idx, 'hora_entrada', e.target.value)}
                          aria-label="Hora de entrada"
                        />
                      </div>

                      {/* Lugar — flexible (no empuja) */}
                      <div className="space-y-1 min-w-0 md:justify-self-stretch">
                        <label className="md:hidden text-sm font-semibold text-muted-foreground">
                          Zona
                        </label>
                        <Input
                          placeholder="zona incidencia"
                          className="w-full min-w-0"
                          value={s.lugar}
                          onChange={(e) => changeSalida(idx, 'lugar', e.target.value)}
                          aria-label="Zona"
                        />
                      </div>

                      {/* Nº intervinientes */}
                      <div className="space-y-1 min-w-0">
                        <label className="md:hidden text-sm font-semibold text-muted-foreground m-2">
                          Bomberos en zona: {totalBomberos}
                        </label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          max={totalBomberos}
                          className="w-28 md:w-24 text-right"
                          value={s.num_intervienen}
                          onChange={(e) =>
                            changeSalida(
                              idx,
                              'num_intervienen',
                              Math.max(
                                0,
                                Math.min(parseInt(e.target.value || '0', 10) || 0, totalBomberos),
                              ),
                            )
                          }
                          aria-label="Número de intervinientes"
                        />
                      </div>

                      {/* Acción */}
                      <div className="flex md:justify-end">
                        <Button variant="secondary" onClick={() => removeSalida(idx)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {msg && (
              <Alert variant="destructive">
                <AlertTitle className="font-bold text-lg">Atención</AlertTitle>
                <AlertDescription className="text-base">{msg}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <Button className="font-bold border-2 border-lime-50" onClick={addSalida}>
                Añadir salida
              </Button>
              <div className="text-xl font-semibold text-muted-foreground md:text-xs md:font-normal">
                Fecha: <b>{fecha}</b> · Bomberos en lista: <b>{totalBomberos}</b>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                className="font-bold border-2 border-lime-50"
                onClick={volverAAnotaciones}
              >
                Atrás
              </Button>
              <Button
                className="font-bold border-2 border-lime-50"
                onClick={guardarSalidas}
                disabled={loading}
              >
                {loading ? 'Guardando…' : 'Guardar salidas'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {metaStorageKey ? (
          <small className="text-xs text-muted-foreground">
            Última subida en este dispositivo:{' '}
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
