// src/app/jr/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const CTX_KEY = 'INFOEX:jr:ctx'

type DestinoJR =
  | {
      tipo: 'unidad'
      zona: string
      unidad_id: string
      unidad_nombre: string
    }
  | {
      tipo: 'caseta'
      zona: string
      caseta_id: string
      caseta_nombre: string
      municipio_id: string
      municipio_nombre: string
    }

export default function StartJR() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [destino, setDestino] = useState<DestinoJR | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Carga de sesión + destino (sin auto-redirect)
  useEffect(() => {
    ;(async () => {
      const meRes = await fetch('/supabase/me', { credentials: 'include' })
      if (meRes.status !== 200) {
        router.replace('/')
        return
      }
      const me = await meRes.json()
      if (me.rol !== 'jr') {
        router.replace('/')
        return
      }

      const destRes = await fetch('/supabase/jr/destino', {
        credentials: 'include',
      })
      const djson = await destRes.json()

      if (!destRes.ok) {
        setError('No tienes una unidad/caseta asignada. Contacta con administración.')
        setLoading(false)
        return
      }

      if (djson.tipo === 'unidad') {
        setDestino({
          tipo: 'unidad',
          zona: djson.zona,
          unidad_id: djson.unidad_id,
          unidad_nombre: djson.unidad_nombre,
        })
      } else {
        setDestino({
          tipo: 'caseta',
          zona: djson.zona,
          caseta_id: djson.caseta_id,
          caseta_nombre: djson.caseta_nombre,
          municipio_id: djson.municipio_id,
          municipio_nombre: djson.municipio_nombre,
        })
      }

      setLoading(false)
    })()
  }, [router])

  // Guardar contexto en localStorage cuando esté listo (NO navegamos)
  useEffect(() => {
    if (loading || !destino) return
    const ctx =
      destino.tipo === 'unidad'
        ? {
            tipo: 'unidad' as const,
            zona: destino.zona,
            unidad: destino.unidad_nombre,
            unidad_id: destino.unidad_id,
          }
        : {
            tipo: 'caseta' as const,
            zona: destino.zona,
            municipio: destino.municipio_nombre,
            caseta: destino.caseta_nombre,
            caseta_id: destino.caseta_id,
          }
    try {
      localStorage.setItem(CTX_KEY, JSON.stringify(ctx))
    } catch {}
  }, [loading, destino])
  /*
  const goNext = () => {
    if (!destino) return

    const params = new URLSearchParams()
    params.set('zona', destino.zona)
    if (destino.tipo === 'unidad') {
      params.set('tipo', 'unidad')
      params.set('unidad', destino.unidad_nombre)
      params.set('unidad_id', destino.unidad_id)
    } else {
      params.set('tipo', 'caseta')
      params.set('municipio', destino.municipio_nombre)
      params.set('caseta', destino.caseta_nombre)
      params.set('caseta_id', destino.caseta_id)
    }
    router.push(`/jr/add?${params.toString()}`)
  }
*/
  const goNext = () => {
    if (!destino) return

    const params = new URLSearchParams()
    params.set('zona', destino.zona)
    if (destino.tipo === 'unidad') {
      params.set('tipo', 'unidad')
      params.set('unidad', destino.unidad_nombre)
      params.set('unidad_id', destino.unidad_id)
    } else {
      params.set('tipo', 'caseta')
      params.set('municipio', destino.municipio_nombre)
      params.set('caseta', destino.caseta_nombre)
      params.set('caseta_id', destino.caseta_id)
    }
    router.push(`/jr/add?${params.toString()}`)
  }

  const goBF = () => {
    router.push('/bf')
  }

  if (loading) return null

  return (
    <main className="h-120 w-full flex items-center justify-center p-4">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="shadow-accent rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">DESTINO ASIGNADO</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            {error ? (
              <div className="text-red-600 text-base">{error}</div>
            ) : destino ? (
              <>
                <div className="space-y-1">
                  <p className="text-lg text-muted-foreground">Zona</p>
                  <p className="text-xl font-bold">{destino.zona}</p>
                </div>

                {destino.tipo === 'unidad' ? (
                  <div className="space-y-1">
                    <p className="text-lg text-muted-foreground">Unidad asignada</p>
                    <p className="text-xl font-bold">{destino.unidad_nombre}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Municipio</p>
                      <p className="text-xl font-bold">{destino.municipio_nombre}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Caseta</p>
                      <p className="text-xl font-bold">{destino.caseta_nombre}</p>
                    </div>
                  </>
                )}

                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={goNext}>
                    Continuar
                  </Button>
                  <Button variant="outline" onClick={goBF}>
                    Ver panel Bombero Forestal
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
