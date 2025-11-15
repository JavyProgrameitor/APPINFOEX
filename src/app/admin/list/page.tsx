'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { Copy } from 'lucide-react'
import { getSupabaseBrowser } from '@/server/client'

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
}

/** Wrapper que Next 15 quiere: página envuelta en Suspense */
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <Card className="rounded-2xl shadow-accent">
            <CardContent className="p-4 text-sm text-muted-foreground">Cargando…</CardContent>
          </Card>
        </main>
      }
    >
      <AdminListBFPageInner />
    </Suspense>
  )
}

function AdminListBFPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')

  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [unidad, setUnidad] = useState<Unidad | null>(null)
  const [caseta, setCaseta] = useState<Caseta | null>(null)
  const [municipio, setMunicipio] = useState<Municipio | null>(null)

  const [anotaciones, setAnotaciones] = useState<Anotacion[] | null>(null)
  const [loadingAnot, setLoadingAnot] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!id) return
      if (typeof window === 'undefined') return
      const supa = getSupabaseBrowser()
      setLoadingUser(true)
      try {
        const { data: u, error } = await supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos,unidad_id,caseta_id,creado_en,rol,email')
          .eq('id', id)
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
  }, [id])

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
  const tituloRol =
    user?.rol === 'jr'
      ? 'Jefe de Servicio'
      : user?.rol === 'bf'
        ? 'Bombero Forestal'
        : 'Administrador'

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-accent">
        <CardHeader>
          <CardTitle className="text-center text-lg md:text-xl text-accent">
            Detalle del Bombero
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {loadingUser ? (
            <div className="space-y-3">
              <div className="h-6 rounded bg-muted/50 animate-pulse" />
              <div className="h-20 rounded bg-muted/50 animate-pulse" />
              <div className="h-32 rounded bg-muted/50 animate-pulse" />
            </div>
          ) : !user ? (
            <div className="text-sm text-muted-foreground">
              No se ha encontrado el usuario. Vuelve al listado y selecciona uno.
            </div>
          ) : (
            <>
              <div>
                <div className="text-center text-xl font-semibold">
                  {user.apellidos}, {user.nombre}
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <span className="font-medium">{tituloRol}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Creado el {new Date(user.creado_en).toLocaleDateString()}
                </div>
                {user.email && (
                  <div className="text-xs font-semibold">
                    Email: <span className="text-primary">{user.email}</span>
                  </div>
                )}
              </div>

              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                <div className="text-xs m-1">DNI</div>
                <div className="flex items-center gap-2 font-mono m-1">
                  <span className="text-sm">{user.dni || '—'}</span>
                  {!!user.dni && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
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

              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full">
                <div className="p-3">
                  <div className="text-xs uppercase text-muted-foreground">Últimas anotaciones</div>
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
                    <div className="text-sm text-muted-foreground">Sin anotaciones recientes.</div>
                  ) : (
                    <ul className="space-y-2">
                      {anotaciones.map((a) => (
                        <li key={a.id} className="text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {new Date(a.fecha).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Entrada {a.hora_entrada} · Salida {a.hora_salida}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Extras: {a.horas_extras}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => router.push('/admin')}>
                  Volver al listado
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
