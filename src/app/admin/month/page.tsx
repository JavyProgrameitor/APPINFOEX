'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { getSupabaseBrowser } from '@/server/client'
import { ArrowLeft, CalendarDays } from 'lucide-react'

interface UsuarioBF {
  id: string
  dni: string | null
  nombre: string
  apellidos: string
}

interface AnotacionDia {
  fecha: string
  codigo: string
}

function AdminMonthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12

  const [anotacionesMes, setAnotacionesMes] = useState<AnotacionDia[]>([])
  const [loadingMes, setLoadingMes] = useState(false)

  // 1) Cargar usuario por id (igual patrón que admin/list)
  useEffect(() => {
    ;(async () => {
      if (!id) {
        setError('No se ha proporcionado un id de usuario.')
        return
      }
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoadingUser(true)
      setError(null)
      try {
        const { data: u, error } = await supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos')
          .eq('id', id)
          .maybeSingle()

        if (error) {
          console.error(error)
          setError('No se ha podido cargar el usuario.')
          setUser(null)
          return
        }
        if (!u) {
          setError('No se ha encontrado el usuario.')
          setUser(null)
          return
        }

        const uNorm: UsuarioBF = {
          id: u.id,
          dni: u.dni ?? null,
          nombre: u.nombre,
          apellidos: u.apellidos,
        }
        setUser(uNorm)
      } catch (e) {
        console.error(e)
        setError('Ha ocurrido un error al cargar los datos del usuario.')
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    })()
  }, [id])

  // 2) Cargar anotaciones del mes para ese usuario
  useEffect(() => {
    ;(async () => {
      if (!user) return
      if (typeof window === 'undefined') return

      const supa = getSupabaseBrowser()
      setLoadingMes(true)

      try {
        const monthStr = month.toString().padStart(2, '0')
        const inicio = `${year}-${monthStr}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const fin = `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`

        const { data, error } = await supa
          .from('anotaciones')
          .select('fecha,codigo')
          .eq('users_id', user.id)
          .gte('fecha', inicio)
          .lte('fecha', fin)
          .order('fecha', { ascending: true })

        if (error) {
          console.error('Error cargando anotaciones del mes:', error.message)
          setAnotacionesMes([])
          return
        }

        setAnotacionesMes((data as AnotacionDia[]) || [])
      } catch (e) {
        console.error(e)
        setAnotacionesMes([])
      } finally {
        setLoadingMes(false)
      }
    })()
  }, [user, year, month])

  const nombreMes = new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })

  const daysInMonth = new Date(year, month, 0).getDate()

  const codigosPorFecha = new Map<string, string>()
  anotacionesMes.forEach((a) => {
    codigosPorFecha.set(a.fecha, a.codigo)
  })

  const cambiarMes = (delta: number) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear = year - 1
    } else if (newMonth > 12) {
      newMonth = 1
      newYear = year + 1
    }
    setMonth(newMonth)
    setYear(newYear)
  }

  return (
    <main className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card className="rounded-2xl shadow-2xl shadow-accent">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl text-accent flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Resumen mensual de anotaciones (Admin)
            </CardTitle>
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                {user.apellidos}, {user.nombre}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al listado
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {loadingUser ? (
            <div className="space-y-3">
              <div className="h-6 rounded bg-muted/50 animate-pulse" />
              <div className="h-20 rounded bg-muted/50 animate-pulse" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : !user ? (
            <div className="text-sm text-muted-foreground">No se ha encontrado el usuario.</div>
          ) : (
            <>
              {/* Selector mes/año */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => cambiarMes(-1)}>
                    ‹ Mes anterior
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => cambiarMes(1)}>
                    Mes siguiente ›
                  </Button>
                </div>
                <div className="text-sm font-semibold capitalize">{nombreMes}</div>
              </div>

              <Separator />

              {/* Rejilla mensual */}
              {loadingMes ? (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <div key={i} className="h-16 rounded bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1
                    const dayStr = day.toString().padStart(2, '0')
                    const monthStr = month.toString().padStart(2, '0')
                    const fechaStr = `${year}-${monthStr}-${dayStr}`

                    const codigo = codigosPorFecha.get(fechaStr) || ''

                    let label = ''
                    if (codigo === 'V') label = 'Vacaciones'
                    else if (codigo === 'AP') label = 'Asuntos propios'
                    else if (codigo === 'H') label = 'Día por horas extra'

                    return (
                      <div
                        key={fechaStr}
                        className="border rounded-md p-2 text-center text-xs bg-card shadow-sm"
                      >
                        <div className="text-sm font-semibold">{day}</div>
                        <div className="mt-1 font-mono text-[0.75rem]">{codigo || '—'}</div>
                        {label && (
                          <div className="mt-0.5 text-[0.65rem] text-muted-foreground">{label}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card className="rounded-2xl shadow-accent">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Cargando resumen mensual…
            </CardContent>
          </Card>
        </main>
      }
    >
      <AdminMonthPageInner />
    </Suspense>
  )
}
