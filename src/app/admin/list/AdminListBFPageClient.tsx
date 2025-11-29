'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { ArrowLeft, ArrowRight, Copy, User } from 'lucide-react'
import { getSupabaseBrowser } from '@/server/client'
import { useToast } from '@/components/ui/Use-toast'

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
  rol: 'bf' | 'jr' | 'admin'
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

interface ResumenHoras {
  total_horas: number
  dias_libres: number
  horas_restantes: number
}

interface ResumenDias {
  year: number
  vacaciones: { total: number; usados: number; restantes: number }
  asuntosPropios: { total: number; usados: number; restantes: number }
}

interface Props {
  userId?: string
}

export default function AdminListBFPageClient({ userId }: Props) {
  const router = useRouter()

  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [unidad, setUnidad] = useState<Unidad | null>(null)
  const [caseta, setCaseta] = useState<Caseta | null>(null)
  const [municipio, setMunicipio] = useState<Municipio | null>(null)

  const [anotaciones, setAnotaciones] = useState<Anotacion[] | null>(null)
  const [loadingAnot, setLoadingAnot] = useState(false)

  const { toast } = useToast()

  const [horas, setHoras] = useState<ResumenHoras>({
    total_horas: 0,
    dias_libres: 0,
    horas_restantes: 0,
  })
  const [dias, setDias] = useState<ResumenDias>({
    year: new Date().getFullYear(),
    vacaciones: { total: 22, usados: 0, restantes: 22 },
    asuntosPropios: { total: 7, usados: 0, restantes: 7 },
  })

  // Carga del usuario y adscripción
  useEffect(() => {
    ;(async () => {
      if (!userId) return
      if (typeof window === 'undefined') return

      const supa = getSupabaseBrowser()
      setLoadingUser(true)

      try {
        const { data: u, error } = await supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos,unidad_id,caseta_id,creado_en,rol,email')
          .eq('id', userId)
          .maybeSingle()

        if (error) throw error
        if (!u) {
          setUser(null)
          return
        }

        const uNorm: UsuarioBF = {
          id: u.id,
          dni: u.dni ?? null,
          nombre: u.nombre,
          apellidos: u.apellidos,
          unidad_id: u.unidad_id ?? null,
          caseta_id: u.caseta_id ?? null,
          creado_en: u.creado_en,
          rol: u.rol,
          email: u.email ?? null,
        }

        setUser(uNorm)

        // carga adscripción
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
        setUser(null)
        setUnidad(null)
        setCaseta(null)
        setMunicipio(null)
      } finally {
        setLoadingUser(false)
      }
    })()
  }, [userId])

  // Cargar últimas anotaciones
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
        setAnotaciones([])
      } finally {
        setLoadingAnot(false)
      }
    })()
  }, [user])

  // Resumen horas extra
  useEffect(() => {
    if (!user) return

    const fetchHoras = async () => {
      try {
        const res = await fetch(`/supabase/horas?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok) {
          return
        }
        setHoras({
          total_horas: data.total_horas,
          dias_libres: data.dias_libres,
          horas_restantes: data.horas_restantes,
        })
      } catch (e) {
        console.error(e)
      }
    }

    fetchHoras()
  }, [user])

  // Resumen días V/AP
  useEffect(() => {
    if (!user) return

    const fetchDias = async () => {
      try {
        const res = await fetch(`/supabase/dias?userId=${user.id}`)
        const data = await res.json()
        if (!res.ok) {
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

  const zona = unidad?.zona || municipio?.zona || '—'
  const tituloRol =
    user?.rol === 'jr'
      ? 'Jefe de Servicio'
      : user?.rol === 'bf'
        ? 'Bombero Forestal'
        : 'Administrador'

  const PROGRESO_UMBRAL = 3.15
  const progreso = PROGRESO_UMBRAL > 0 ? Math.min(horas.horas_restantes / PROGRESO_UMBRAL, 1) : 0

  const progresoVac =
    dias.vacaciones.total > 0 ? Math.min(dias.vacaciones.usados / dias.vacaciones.total, 1) : 0

  const progresoAP =
    dias.asuntosPropios.total > 0
      ? Math.min(dias.asuntosPropios.usados / dias.asuntosPropios.total, 1)
      : 0

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-accent">
        <CardHeader className="flex items-center justify-center">
          <User className="w-10 h-10"></User>
          <CardTitle>Información del Bombero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-2">
          {loadingUser ? (
            <div className="space-y-3">
              <div className="h-6 rounded bg-muted/50 animate-pulse" />
              <div className="h-20 rounded bg-muted/50 animate-pulse" />
              <div className="h-32 rounded bg-muted/50 animate-pulse" />
            </div>
          ) : !user ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground ">
              No se ha encontrado el usuario. Vuelve al listado y selecciona uno.
            </div>
          ) : (
            <>
              {/* Cabecera usuario */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xl font-semibold">
                    {user.apellidos}, {user.nombre}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{tituloRol}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Creado el{' '}
                    {new Date(user.creado_en).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                  {user.email && (
                    <div className="text-xs font-semibold">
                      Email: <span className="text-primary">{user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* DNI */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                <div className="text-xs m-1">DNI</div>

                <div className="flex items-center gap-2 font-mono m-1">
                  <span className="text-sm">{user.dni || '—'}</span>

                  {!!user.dni && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      onClick={async () => {
                        await navigator.clipboard.writeText(user.dni!)
                        toast({
                          title: 'DNI copiado',
                          description: `El DNI ${user.dni} se ha copiado al portapapeles.`,
                        })
                      }}
                      aria-label="Copiar DNI"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Adscripción */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                <div className="text-xs uppercase text-muted-foreground m-1">Adscripción</div>
                <div className="text-sm m-1">
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
                        Zona: <span className="font-medium">{municipio?.zona || '—'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Sin asignación</div>
                  )}
                </div>
              </div>

              {/* Últimas anotaciones + resumen horas extra */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                <div className="p-3">
                  <div className="text-xs uppercase text-muted-foreground">Últimas anotaciones</div>
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
                    <div className="text-sm text-muted-foreground">Sin anotaciones recientes.</div>
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

                          {/* Derecha: mostrar siempre el código y, según caso, detalle */}
                          <div className="text-right">
                            {a.horas_extras > 0 ? (
                              <>
                                {/* Código siempre visible */}
                                {a.codigo && (
                                  <div className="text-xs font-semibold text-animate">
                                    {a.codigo}
                                    <div className="text-xs text-red-500">Trabajo diario</div>
                                  </div>
                                )}
                                <div className="text-xs text-violet-500">
                                  Horas extras generadas
                                </div>
                                <div className="text-xs font-semibold">
                                  {a.horas_extras.toFixed(2)} h
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Código siempre visible, para TODOS (JR, TH, TC, V, B, AP, H, etc.) */}
                                {a.codigo && (
                                  <div className="text-xs font-semibold text-animate">
                                    {a.codigo}
                                  </div>
                                )}

                                {/* Descripción solo para algunos códigos concretos */}
                                {a.codigo === 'V' && (
                                  <div className="text-xs text-animate">Vacaciones</div>
                                )}
                                {a.codigo === 'AP' && (
                                  <div className="text-xs text-blue-500">Asuntos propios</div>
                                )}
                                {a.codigo === 'H' && (
                                  <div className="text-xs text-yellow-500">
                                    Horas extras solicitadas
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Resumen horas extra */}
                  <div className="mt-2 text-xs sm:text-sm space-y-1">
                    <p>
                      <strong>Horas extra acumuladas:</strong> {horas.total_horas.toFixed(2)} h
                    </p>
                    <p>
                      <strong>Días por horas extra disponibles:</strong> {horas.dias_libres}
                    </p>
                    <p>
                      <strong>Horas acumuladas hacia el próximo día libre:</strong>{' '}
                      {horas.horas_restantes.toFixed(2)} h
                    </p>

                    <div className="mt-2">
                      <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-1">
                        <span>Progreso próximo día libre</span>
                        <span>
                          {horas.horas_restantes.toFixed(2)} / {PROGRESO_UMBRAL} h
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
                </div>
              </div>

              {/* Resumen vacaciones y AP */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full p-3 space-y-2 text-xs sm:text-sm">
                <p className="font-semibold">Año {dias.year}</p>

                <div>
                  <p>
                    <strong>Vacaciones:</strong> {dias.vacaciones.usados} / {dias.vacaciones.total}{' '}
                    usadas ·{' '}
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
                    {dias.asuntosPropios.total} usados ·{' '}
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

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => router.push('/admin')}>
                  <ArrowLeft />
                  Volver al listado
                </Button>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="ghost" onClick={() => router.push(`/admin/month?id=${user.id}`)}>
                    Ver resumen mensual
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
