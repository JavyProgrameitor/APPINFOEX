'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { getSupabaseBrowser } from '@/server/client'
import { Copy, Flame, IdCard, MapPin, Clock, ArrowLeft, ArrowRight } from 'lucide-react'

type Rol = 'bf' | 'jr'

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
  unidad_id: string | null
  caseta_id: string | null
  creado_en: string
  rol: Rol
  email: string | null
}

interface Anotacion {
  id: string
  fecha: string
  hora_entrada: string
  hora_salida: string
  horas_extras: number
  codigo: string
}

// Detalle simple para listado de horas extra por día
interface HorasExtraDetalle {
  id: string
  fecha: string
  horas_extras: number
}

/** Página envuelta en Suspense igual que en admin/list */
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <Card className="rounded-2xl shadow-accent">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Cargando tus datos de Bombero Forestal…
            </CardContent>
          </Card>
        </main>
      }
    >
      <BFListPageInner />
    </Suspense>
  )
}

function BFListPageInner() {
  const router = useRouter()

  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [unidad, setUnidad] = useState<Unidad | null>(null)
  const [caseta, setCaseta] = useState<Caseta | null>(null)
  const [municipio, setMunicipio] = useState<Municipio | null>(null)

  const [anotaciones, setAnotaciones] = useState<Anotacion[] | null>(null)
  const [loadingAnot, setLoadingAnot] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // estado para horas acumuladas y días libres
  const [horas, setHoras] = useState({
    total: 0,
    dias: 0,
    restantes: 0,
  })

  const [dias, setDias] = useState({
    year: new Date().getFullYear(),
    vacaciones: { total: 22, usados: 0, restantes: 22 },
    asuntosPropios: { total: 7, usados: 0, restantes: 7 },
  })

  // detalle de horas extra por día
  const [horasExtrasDetalle, setHorasExtrasDetalle] = useState<HorasExtraDetalle[]>([])
  const [loadingHorasExtras, setLoadingHorasExtras] = useState(false)

  // 1) Cargar datos del propio usuario BF
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

        // Cargar adscripción
        if (uNorm.unidad_id) {
          const { data: un } = await supa
            .from('unidades')
            .select('id,nombre,zona')
            .eq('id', uNorm.unidad_id)
            .maybeSingle()
          setUnidad((un as Unidad) || null)
          setCaseta(null)
          setMunicipio(null)
        } else if (uNorm.caseta_id) {
          const { data: c } = await supa
            .from('casetas')
            .select('id,nombre,municipio_id')
            .eq('id', uNorm.caseta_id)
            .maybeSingle()
          const cas = (c as Caseta) || null
          setCaseta(cas)
          if (cas) {
            const { data: m } = await supa
              .from('municipios')
              .select('id,nombre,zona')
              .eq('id', cas.municipio_id)
              .maybeSingle()
            setMunicipio((m as Municipio) || null)
          } else {
            setMunicipio(null)
          }
          setUnidad(null)
        } else {
          setUnidad(null)
          setCaseta(null)
          setMunicipio(null)
        }
      } catch (e) {
        console.error(e)
        setError('Ha ocurrido un error al cargar tus datos.')
      } finally {
        setLoadingUser(false)
      }
    })()
  }, [])

  // 2) Cargar últimas anotaciones asociadas al usuario (incluyendo codigo)
  useEffect(() => {
    ;(async () => {
      if (!user) return
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoadingAnot(true)
      try {
        const { data } = await supa
          .from('anotaciones')
          .select('id,fecha,hora_entrada,hora_salida,horas_extras,codigo')
          .eq('users_id', user.id)
          .order('fecha', { ascending: false })
          .limit(8)
        setAnotaciones((data as Anotacion[]) || [])
      } catch (e) {
        console.error(e)
        setAnotaciones([])
      } finally {
        setLoadingAnot(false)
      }
    })()
  }, [user])

  // Cargar horas extras acumuladas + días libres desde /supabase/horas
  useEffect(() => {
    if (!user) return

    const fetchHoras = async () => {
      try {
        const res = await fetch(`/supabase/horas?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok) {
          console.error('Error horas:', data)
          return
        }
        setHoras({
          total: data.total_horas,
          dias: data.dias_libres,
          restantes: data.horas_restantes,
        })
      } catch (e) {
        console.error(e)
      }
    }

    fetchHoras()
  }, [user])

  // Cargar días de vacaciones (V) y asuntos propios (AP)
  useEffect(() => {
    if (!user) return

    const fetchDias = async () => {
      try {
        const res = await fetch(`/supabase/dias?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok) {
          console.error('Error días V/AP:', data)
          return
        }
        setDias({
          year: data.year,
          vacaciones: data.vacaciones,
          asuntosPropios: data.asuntosPropios,
        })
      } catch (e) {
        console.error(e)
      }
    }

    fetchDias()
  }, [user])

  // Detalle de horas extra (solo las que tienen horas_extras > 0)
  useEffect(() => {
    ;(async () => {
      if (!user) return
      if (typeof window === 'undefined') return

      const supa = getSupabaseBrowser()
      setLoadingHorasExtras(true)
      try {
        const { data, error } = await supa
          .from('anotaciones')
          .select('id,fecha,horas_extras')
          .eq('users_id', user.id)
          .gt('horas_extras', 0)
          .order('fecha', { ascending: false })
          .limit(10) // últimas 10 con horas extra

        if (error) {
          console.error('Error cargando detalle de horas extra:', error.message)
          setHorasExtrasDetalle([])
          return
        }

        setHorasExtrasDetalle((data as HorasExtraDetalle[]) || [])
      } catch (e) {
        console.error(e)
        setHorasExtrasDetalle([])
      } finally {
        setLoadingHorasExtras(false)
      }
    })()
  }, [user])

  const zona = unidad?.zona || municipio?.zona || '—'

  const PROGRESO_UMBRAL = 3.15 // para horas extra
  const progreso = PROGRESO_UMBRAL > 0 ? Math.min(horas.restantes / PROGRESO_UMBRAL, 1) : 0

  const progresoVac =
    dias.vacaciones.total > 0 ? Math.min(dias.vacaciones.usados / dias.vacaciones.total, 1) : 0

  const progresoAP =
    dias.asuntosPropios.total > 0
      ? Math.min(dias.asuntosPropios.usados / dias.asuntosPropios.total, 1)
      : 0

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-2xl shadow-accent">
        <CardHeader className="flex flex-col items-center justify-between gap-2">
          <CardTitle className="text-lg md:text-xl text-accent flex items-center gap-2">
            <Flame color="#F52121" className="bg-amber-400 rounded-full" />
            Mi ficha de Bombero Forestal
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Aquí puedes consultar todos los datos de Bombero Forestal.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {loadingUser ? (
            <div className="space-y-3">
              <div className="h-6 rounded bg-muted/50 animate-pulse" />
              <div className="h-20 rounded bg-muted/50 animate-pulse" />
              <div className="h-32 rounded bg-muted/50 animate-pulse" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : !user ? (
            <div className="text-sm text-muted-foreground">
              No se ha encontrado tu ficha personal. Si crees que es un error, contacta con tu
              administrador.
            </div>
          ) : (
            <>
              {/* Resumen principal */}
              <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
                {/* Datos personales */}
                <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-default shadow-accent h-full">
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4" />
                      <div className="text-xs uppercase text-muted-foreground">
                        Datos personales
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-3 space-y-1 text-sm">
                    <div className="font-semibold">
                      {user.apellidos}, {user.nombre}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rol: <span className="font-medium">Bombero Forestal</span>
                    </div>
                    <div className="text-xs mt-2">
                      DNI:{' '}
                      <span className="font-mono font-semibold">{user.dni ? user.dni : '—'}</span>
                    </div>
                    <div className="text-xs mt-1">
                      Email:{' '}
                      <span className="font-medium text-primary">
                        {user.email ? user.email : '—'}
                      </span>
                    </div>
                    <div className="mt-2 text-[0.7rem] text-muted-foreground">
                      Usuario creado el{' '}
                      <span className="font-medium">
                        {new Date(user.creado_en).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Adscripción territorial */}
                <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-default shadow-accent h-full">
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <div className="text-xs uppercase text-muted-foreground">Adscripción</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-3 text-sm space-y-1">
                    {unidad ? (
                      <>
                        <div>
                          Unidad: <span className="font-medium">{unidad.nombre}</span>
                        </div>
                        <div>
                          Zona: <span className="font-medium">{unidad.zona}</span>
                        </div>
                      </>
                    ) : caseta ? (
                      <>
                        <div>
                          Caseta: <span className="font-medium">{caseta.nombre}</span>
                        </div>
                        <div>
                          Municipio: <span className="font-medium">{municipio?.nombre || '—'}</span>
                        </div>
                        <div>
                          Zona: <span className="font-medium">{municipio?.zona || '—'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        No tienes una unidad o caseta asignada actualmente.
                      </div>
                    )}

                    <div className="pt-2 text-[0.7rem] text-muted-foreground">
                      Zona operativa: <span className="font-semibold">{zona}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DNI rápido para copiar en móvil */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">DNI</div>
                    <div className="font-mono text-sm">{user.dni || '—'}</div>
                  </div>
                  {user.dni && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        await navigator.clipboard.writeText(user.dni!)
                      }}
                      aria-label="Copiar DNI"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Últimas anotaciones + resumen de horas extra + detalle de horas extra */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition shadow-accent">
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <div className="text-xs uppercase text-muted-foreground">
                      Últimas anotaciones
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="p-3 space-y-3">
                  {loadingAnot ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-9 rounded bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : !anotaciones?.length ? (
                    <div className="text-sm text-muted-foreground">
                      No hay anotaciones registradas todavía.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {anotaciones.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between text-xs rounded-sm border bg-background/60 px-2 py-1"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(a.fecha).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                            <span className="text-[0.7rem] text-muted-foreground">
                              {a.hora_entrada} - {a.hora_salida}
                            </span>
                          </div>

                          {/* Derecha: o bien horas extra, o bien Vacaciones / AP */}
                          <div className="text-right">
                            {a.horas_extras > 0 ? (
                              <>
                                <div className="text-[0.7rem] text-muted-foreground">Extras</div>
                                <div className="text-xs font-semibold">
                                  {a.horas_extras.toFixed(2)} h
                                </div>
                              </>
                            ) : a.codigo === 'V' ? (
                              <div className="text-xs font-semibold text-emerald-700">
                                Vacaciones
                              </div>
                            ) : a.codigo === 'AP' ? (
                              <div className="text-xs font-semibold text-sky-700">
                                Asuntos propios
                              </div>
                            ) : a.codigo === 'H' ? (
                              <div className="text-xs font-semibold text-yellow-700">
                                Horas Extras
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Resumen horas extra */}
                  <div className="mt-2 text-xs sm:text-sm space-y-1">
                    <p>
                      <strong>Horas extra acumuladas:</strong> {horas.total.toFixed(2)} h
                    </p>
                    <p>
                      <strong>Días libres de Horas extra por solicitar:</strong> {horas.dias}
                    </p>
                    <p>
                      <strong>Horas acumuladas hacia el próximo día libre:</strong>{' '}
                      {horas.restantes.toFixed(2)} h
                    </p>

                    <div className="mt-2">
                      <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-1">
                        <span>Progreso próximo día libre</span>
                        <span>
                          {horas.restantes.toFixed(2)} / {PROGRESO_UMBRAL} h
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-amber-300"
                          style={{ width: `${progreso * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detalle de horas extra por día */}
                  <div className="mt-3 text-xs sm:text-sm space-y-2">
                    <div className="text-xs uppercase text-muted-foreground">
                      HORAS EXTRAS GENERADAS
                    </div>

                    {loadingHorasExtras ? (
                      <div className="space-y-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-6 rounded bg-muted/50 animate-pulse" />
                        ))}
                      </div>
                    ) : !horasExtrasDetalle.length ? (
                      <div className="text-xs text-muted-foreground">
                        No hay horas extra registradas todavía.
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {horasExtrasDetalle.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center justify-between rounded-sm border bg-background/60 px-2 py-1"
                          >
                            <div className="text-[0.75rem] sm:text-xs">
                              {new Date(h.fecha).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </div>
                            <div className="text-[0.75rem] sm:text-xs font-semibold">
                              {Number(h.horas_extras).toFixed(2)} h
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen de vacaciones y asuntos propios */}
              <div className="mt-3 text-xs sm:text-sm space-y-2">
                <p className="font-semibold">Año {dias.year}</p>

                <div>
                  <p>
                    <strong>Vacaciones:</strong> {dias.vacaciones.usados} / {dias.vacaciones.total}{' '}
                    usadas
                    {' · '}
                    <span className="font-medium">{dias.vacaciones.restantes} restantes</span>
                  </p>
                  <div className="mt-1">
                    <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-1">
                      <span>Progreso vacaciones</span>
                      <span>
                        {dias.vacaciones.usados} / {dias.vacaciones.total} días
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-amber-300"
                        style={{ width: `${progresoVac * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p>
                    <strong>Asuntos propios:</strong> {dias.asuntosPropios.usados} /{' '}
                    {dias.asuntosPropios.total} usados
                    {' · '}
                    <span className="font-medium">{dias.asuntosPropios.restantes} restantes</span>
                  </p>
                  <div className="mt-1">
                    <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-1">
                      <span>Progreso asuntos propios</span>
                      <span>
                        {dias.asuntosPropios.usados} / {dias.asuntosPropios.total} días
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-amber-300"
                        style={{ width: `${progresoAP * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-1 sm:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.push('/bf')}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Inicio
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push('/bf/send')}>
                  Solicitudes
                  <ArrowRight className="h-4 w-4 mr-1" />
                </Button>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => router.push('/bf')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Inicio
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => router.push('/bf/send')}
            >
              Solicitudes
              <ArrowRight className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
