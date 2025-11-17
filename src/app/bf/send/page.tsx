'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { getSupabaseBrowser } from '@/server/client'
import { ArrowLeft, CalendarDays, Flame, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'

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

interface Solicitud {
  id: string
  fecha: string
  codigo: string
}

function BFSendPageInner() {
  const router = useRouter()
  const [loadingUser, setLoadingUser] = useState(false)
  const [user, setUser] = useState<UsuarioBF | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<'V' | 'AP'>('V')
  const [fecha, setFecha] = useState<string>('')
  const [enviando, setEnviando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)

  const [pageSize, setPageSize] = useState<10 | 20 | 30>(10)

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

  const recargarSolicitudes = async (usuarioId: string, limit: number) => {
    const supa = getSupabaseBrowser()
    setLoadingSolicitudes(true)
    try {
      const { data, error } = await supa
        .from('anotaciones')
        .select('id,fecha,codigo')
        .eq('users_id', usuarioId)
        .in('codigo', ['V', 'AP'])
        .order('fecha', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error cargando solicitudes V/AP:', error.message)
        setSolicitudes([])
        return
      }

      setSolicitudes((data as Solicitud[]) || [])
    } catch (e) {
      console.error(e)
      setSolicitudes([])
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  useEffect(() => {
    if (!user) return
    recargarSolicitudes(user.id, pageSize)
  }, [user, pageSize])

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setMensajeOk(null)
    setMensajeError(null)

    if (!fecha) {
      setMensajeError('Debes seleccionar una fecha.')
      return
    }

    try {
      setEnviando(true)
      const supa = getSupabaseBrowser()

      const { error: insertErr } = await supa.from('anotaciones').insert({
        users_id: user.id,
        fecha,
        codigo: tipo,
        hora_entrada: '00:00',
        hora_salida: '00:00',
        // horas_extras se deja que use el DEFAULT 0
      })

      if (insertErr) {
        console.error('Error insertando solicitud V/AP:', insertErr.message)
        setMensajeError('No se ha podido registrar la solicitud. Inténtalo de nuevo.')
        return
      }

      setMensajeOk(
        `Solicitud registrada correctamente como ${
          tipo === 'V' ? 'Vacaciones' : 'Asuntos propios'
        } para el ${new Date(fecha).toLocaleDateString('es-ES')}.`,
      )
      // refrescar lista con el tamaño actual seleccionado
      recargarSolicitudes(user.id, pageSize)
    } catch (e) {
      console.error(e)
      setMensajeError('Ha ocurrido un error al enviar la solicitud.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <Card className="rounded-2xl shadow-2xl shadow-accent">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl text-accent flex items-center gap-2">
              <Flame color="#F52121" className="bg-amber-400 rounded-full" />
              Solicitud de días (Vacaciones / AP)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Solicita días de vacaciones o asuntos propios. Se registrarán como anotaciones en tu
              ficha.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => router.push('/bf')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 p-4  shadow-accent">
          {loadingUser ? (
            <div className="space-y-3">
              <div className="h-6 rounded bg-muted/50 animate-pulse" />
              <div className="h-20 rounded bg-muted/50 animate-pulse" />
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
              {/* FORMULARIO DE SOLICITUD */}
              <form
                onSubmit={handleEnviar}
                className="rounded-sm border bg-card text-center shadow-2xl hover:shadow-md transition shadow-accent"
              >
                <div className="p-3 flex items-center justify-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <div className=" text-xl font-bold text-accent">Nueva solicitud de día</div>
                </div>
                <Separator />
                <div className="p-3 space-y-3 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Tipo de día */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tipo de Solicitud
                      </label>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant={tipo === 'V' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTipo('V')}
                        >
                          Vacaciones (V)
                        </Button>
                        <Button
                          type="button"
                          variant={tipo === 'AP' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTipo('AP')}
                        >
                          Asuntos propios (AP)
                        </Button>
                      </div>
                      <p className="text-[0.7rem] text-muted-foreground">
                        Se contabilizará como un día de{' '}
                        {tipo === 'V' ? 'vacaciones.' : 'asuntos propios.'}
                      </p>
                    </div>

                    {/* Fecha */}
                    <div className="flex items-center justify-center gap-1">
                      <label className="text-xs font-bold text-muted-foreground">Fecha</label>
                      <Input
                        type="date"
                        className="rounded-2xl w-32 shadow-2xl shadow-accent"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>
                  </div>

                  {mensajeError && (
                    <div className="text-xs text-destructive mt-1">{mensajeError}</div>
                  )}
                  {mensajeOk && <div className="text-xs text-emerald-600 mt-1">{mensajeOk}</div>}

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" variant="ghost" disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Enviar solicitud'}
                    </Button>
                  </div>
                </div>
              </form>

              {/* LISTADO DE ÚLTIMAS SOLICITUDES */}
              <div className="rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition shadow-accent">
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <div className="text-xs uppercase text-muted-foreground">
                      Tus solicitudes registradas (V / AP)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[0.7rem] md:text-xs">
                    <span className="text-muted-foreground hidden sm:inline">Mostrar</span>
                    {[10, 20, 30].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={pageSize === n ? 'default' : 'outline'}
                        className="h-6 px-2"
                        onClick={() => setPageSize(n as 10 | 20 | 30)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="p-3 space-y-2 text-sm">
                  {loadingSolicitudes ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-8 rounded bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : !solicitudes.length ? (
                    <div className="text-sm text-muted-foreground">
                      Todavía no tienes solicitudes de vacaciones ni asuntos propios registradas.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {solicitudes.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between text-xs rounded-sm border bg-background/60 px-2 py-1"
                        >
                          <div>
                            <div className="font-medium">
                              {new Date(s.fecha).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className="text-[0.7rem] text-muted-foreground uppercase">
                            {s.codigo === 'V'
                              ? 'Vacaciones'
                              : s.codigo === 'AP'
                                ? 'Asuntos propios'
                                : s.codigo}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

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

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <Card className="rounded-2xl shadow-accent">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Cargando panel de solicitudes…
            </CardContent>
          </Card>
        </main>
      }
    >
      <BFSendPageInner />
    </Suspense>
  )
}
