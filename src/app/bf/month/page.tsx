'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { getSupabaseBrowser } from '@/server/client'
import { ArrowLeft, CalendarDays } from 'lucide-react'

type Rol = 'bf' | 'jr'

interface UsuarioBF {
  id: string
  dni: string | null
  nombre: string
  apellidos: string
  unidad_id: string | null
  caseta_id: string | null
  creado_en: string
  rol: Rol
  email: string | null
}

interface AnotacionDia {
  fecha: string
  codigo: string
}

function BFMonthPageInner() {
  const router = useRouter()

  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [error, setError] = useState<string | null>(null)

  // mes/año seleccionados
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12

  const [anotacionesMes, setAnotacionesMes] = useState<AnotacionDia[]>([])
  const [loadingMes, setLoadingMes] = useState(false)

  // 1) Cargar usuario BF (igual patrón que en bf/list)
  useEffect(() => {
    ;(async () => {
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoadingUser(true)
      setError(null)
      try {
        const {
          data: { user: authUser },
          error: authErr,
        } = await supa.auth.getUser()
        if (authErr || !authUser) {
          setError('No se ha podido obtener tu sesión. Vuelve a iniciar sesión.')
          return
        }

        const { data: rec, error: userErr } = await supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos,unidad_id,caseta_id,creado_en,rol,email')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        if (userErr) {
          setError('No se han podido cargar tus datos de usuario.')
          console.error(userErr)
          return
        }
        if (!rec) {
          setError('No se ha encontrado tu ficha de Bombero en la base de datos.')
          return
        }

        const uNorm: UsuarioBF = {
          id: rec.id,
          dni: rec.dni ?? null,
          nombre: rec.nombre,
          apellidos: rec.apellidos,
          unidad_id: rec.unidad_id ?? null,
          caseta_id: rec.caseta_id ?? null,
          creado_en: rec.creado_en,
          rol: rec.rol as Rol,
          email: rec.email ?? null,
        }
        setUser(uNorm)
      } catch (e) {
        console.error(e)
        setError('Ha ocurrido un error al cargar tus datos.')
      } finally {
        setLoadingUser(false)
      }
    })()
  }, [])

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
        // último día del mes
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

  // helper: nombre de mes
  const nombreMes = new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })

  // helper: número de días del mes
  const daysInMonth = new Date(year, month, 0).getDate()

  // mapa fecha -> código
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
      <Card className="rounded-2xl shadow-accent">
        <CardHeader className="flex items-center justify-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <CardTitle className="text-lg md:text-xl text-animate flex items-center gap-2">
            Resumen mensual de anotaciones
          </CardTitle>
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
            <div className="text-sm text-muted-foreground">
              No se ha encontrado tu ficha personal.
            </div>
          ) : (
            <>
              {/* Selector de mes/año */}
              <div className="flex items-center justify-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => cambiarMes(-1)}>
                    ‹ Mes anterior
                  </Button>
                  <div className="text-animate font-black capitalize">{nombreMes}</div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => cambiarMes(1)}>
                    Mes siguiente ›
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Rejilla mensual */}
              {loadingMes ? (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <div key={i} className="h-20 rounded-sm" />
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

                    // Día de la semana (lun, mar, mié...)
                    const dateObj = new Date(year, month - 1, day)
                    const weekday = dateObj.toLocaleDateString('es-ES', {
                      weekday: 'short',
                    })

                    // descripción legible para algunos códigos
                    let label = ''
                    if (codigo === 'V') label = 'Vacaciones'
                    else if (codigo === 'AP') label = 'Asuntos propios'
                    else if (codigo === 'H') label = 'Horas extras'

                    // colores según código
                    let cellClasses = 'border rounded-md p-2 text-center text-xs bg-card shadow-sm'
                    let codigoClasses = 'mt-1 font-mono text-xs'
                    if (codigo === 'V') {
                      cellClasses =
                        'bg-success text-success-foreground rounded-md p-2 text-center text-xs shadow-sm'
                      codigoClasses = 'mt-1 font-black text-sm text-success'
                    } else if (codigo === 'AP') {
                      cellClasses =
                        'bg-info text-info-foreground rounded-md p-2 text-center text-xs shadow-sm'
                      codigoClasses = 'mt-1 font-black text-sm text-info'
                    } else if (codigo === 'H') {
                      cellClasses =
                        'bg-warning text-warning-foreground rounded-md p-2 text-center text-xs shadow-sm'
                      codigoClasses = 'mt-1 font-black text-sm text-warning'
                    }

                    return (
                      <div key={fechaStr} className={cellClasses}>
                        <div className="text-sm font-semibold">{day}</div>
                        <div className="text-sm text-muted-foreground capitalize">{weekday}</div>
                        <div className={codigoClasses}>{codigo || '—'}</div>
                        {label && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center justify-center">
                <Button variant="ghost" size="sm" onClick={() => router.push('/bf/list')}>
                  <ArrowLeft></ArrowLeft>
                  Mis Datos
                </Button>
              </div>
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
      <BFMonthPageInner />
    </Suspense>
  )
}
