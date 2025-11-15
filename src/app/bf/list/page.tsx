'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { getSupabaseBrowser } from '@/server/client'
import { Copy, Flame, IdCard, MapPin, Clock, ArrowLeft } from 'lucide-react'

type Rol = 'admin' | 'bf' | 'jr'

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

        if (rec.rol !== 'bf') {
          // Middleware debería evitar esto, pero por si acaso:
          setError('Esta pantalla está reservada para el rol Bombero Forestal.')
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

  // 2) Cargar últimas anotaciones asociadas al usuario (igual que en admin/list)
  useEffect(() => {
    ;(async () => {
      if (!user) return
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoadingAnot(true)
      try {
        const { data } = await supa
          .from('anotaciones')
          .select('id,fecha,hora_entrada,hora_salida,horas_extras')
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

  const zona = unidad?.zona || municipio?.zona || '—'

  const tituloPrincipal = 'Mi ficha de Bombero Forestal'

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-accent">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl text-accent flex items-center gap-2">
              <Flame className="h-5 w-5" />
              {tituloPrincipal}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Aquí puedes consultar todos los datos que se han registrado sobre tu rol de Bombero
              Forestal.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => router.push('/bf')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al panel
          </Button>
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

              {/* DNI rápido para copiar en movil */}
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

              {/* Últimas anotaciones */}
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
                <div className="p-3 space-y-2">
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
                          <div className="text-right">
                            <div className="text-[0.7rem] text-muted-foreground">Extras</div>
                            <div className="text-xs font-semibold">
                              {a.horas_extras?.toFixed?.(2) ?? a.horas_extras ?? 0} h
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Botón volver en móvil */}
              <div className="flex justify-start pt-1 sm:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.push('/bf')}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver al panel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
