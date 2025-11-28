'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Separator } from '@/components/ui/Separator'
import { useToast } from '@/components/ui/Use-toast'
import { getSupabaseBrowser } from '@/server/client'
import { UserX, Search, ShieldAlert, Trash2, Loader2, ArrowLeft } from 'lucide-react'

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

interface UsuarioBasic {
  id: string
  dni: string | null
  nombre: string | null
  apellidos: string | null
  unidad_id: string | null
  caseta_id: string | null
  rol: Rol
  email?: string | null
}

interface Props {
  initialDni?: string
  initialId?: string
}

export default function AdminDeleteUserPageClient({ initialDni, initialId }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [dniQuery, setDniQuery] = useState(initialDni ?? '')
  const [loadingUser, setLoadingUser] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [user, setUser] = useState<UsuarioBasic | null>(null)
  const [unidad, setUnidad] = useState<Unidad | null>(null)
  const [caseta, setCaseta] = useState<Caseta | null>(null)
  const [municipio, setMunicipio] = useState<Municipio | null>(null)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmDni, setConfirmDni] = useState('')

  // ========= CARGA INICIAL A PARTIR DE LOS QUERY PARAMS =========
  useEffect(() => {
    const run = async () => {
      // Si viene ?dni= en la URL, buscamos por DNI
      if (initialDni && initialDni.trim()) {
        setDniQuery(initialDni)
        await handleSearch(initialDni)
        return
      }

      // Si viene ?id= en la URL, cargamos por ID
      if (initialId && initialId.trim()) {
        await loadById(initialId)
      }
    }

    void run()
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadById(id: string) {
    setLoadingUser(true)
    setErrorMsg(null)
    setUser(null)
    setUnidad(null)
    setCaseta(null)
    setMunicipio(null)

    try {
      const supa = getSupabaseBrowser()
      const { data, error } = await supa
        .from('usuarios')
        .select('id,dni,nombre,apellidos,rol,unidad_id,caseta_id,email')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        setErrorMsg('No se encontró el usuario indicado.')
        return
      }

      const u: UsuarioBasic = {
        id: data.id,
        dni: data.dni ?? null,
        nombre: data.nombre ?? null,
        apellidos: data.apellidos ?? null,
        rol: data.rol as Rol,
        unidad_id: data.unidad_id ?? null,
        caseta_id: data.caseta_id ?? null,
        email: data.email ?? null,
      }

      setUser(u)
      setDniQuery(u.dni || '')
      await loadAdscripcion(u)
    } catch {
      setErrorMsg('Error al cargar el usuario.')
    } finally {
      setLoadingUser(false)
    }
  }

  async function loadAdscripcion(u: UsuarioBasic) {
    try {
      const supa = getSupabaseBrowser()

      setUnidad(null)
      setCaseta(null)
      setMunicipio(null)

      if (u.unidad_id) {
        const { data: un } = await supa
          .from('unidades')
          .select('id,nombre,zona')
          .eq('id', u.unidad_id)
          .maybeSingle()
        setUnidad((un as Unidad) || null)
      } else if (u.caseta_id) {
        const { data: c } = await supa
          .from('casetas')
          .select('id,nombre,municipio_id')
          .eq('id', u.caseta_id)
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
        }
      }
    } catch {
      // silencioso
    }
  }

  async function handleSearch(dniOverride?: string) {
    const dni = (dniOverride ?? dniQuery).trim()
    if (!dni) {
      setErrorMsg('Introduce un DNI para buscar.')
      setUser(null)
      setUnidad(null)
      setCaseta(null)
      setMunicipio(null)
      return
    }

    setLoadingUser(true)
    setErrorMsg(null)
    setUser(null)
    setUnidad(null)
    setCaseta(null)
    setMunicipio(null)

    try {
      const res = await fetch(`/supabase/usuarios/dni?dni=${encodeURIComponent(dni)}`, {
        credentials: 'include',
      })

      if (res.status === 404) {
        setErrorMsg('No se ha encontrado ningún usuario con ese DNI.')
        return
      }
      if (!res.ok) {
        setErrorMsg('Error al buscar el usuario. Inténtalo de nuevo.')
        return
      }

      const data = await res.json()

      const u: UsuarioBasic = {
        id: data.id,
        dni: data.dni,
        nombre: data.nombre,
        apellidos: data.apellidos,
        rol: data.rol,
        unidad_id: data.unidad_id,
        caseta_id: data.caseta_id,
      }

      setUser(u)
      await loadAdscripcion(u)
    } catch {
      setErrorMsg('No se ha podido contactar con el servidor.')
    } finally {
      setLoadingUser(false)
    }
  }

  const canDelete =
    !!user &&
    !loadingDelete &&
    confirmDni.trim().toUpperCase() === (user.dni || '').trim().toUpperCase()

  async function handleDelete() {
    if (!user) return
    if (!canDelete) {
      toast({
        title: 'Confirmación incompleta',
        description: 'Debes escribir el DNI completo del usuario para poder eliminarlo.',
        variant: 'destructive',
      })
      return
    }

    setLoadingDelete(true)
    setErrorMsg(null)

    try {
      const supa = getSupabaseBrowser()
      const {
        data: { session },
      } = await supa.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/supabase/admin/eliminar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ usuario_id: user.id }),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg =
          json?.error ||
          (res.status === 403
            ? 'No tienes permisos para eliminar usuarios.'
            : 'No se pudo eliminar el usuario.')

        setErrorMsg(msg)
        toast({
          title: 'No se pudo eliminar',
          description: msg,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Usuario eliminado',
        description: `El usuario ${user.apellidos ?? ''} ${user.nombre ?? ''} ha sido eliminado.`,
      })

      setUser(null)
      setUnidad(null)
      setCaseta(null)
      setMunicipio(null)
      setConfirmDni('')
      setDniQuery('')

      router.push('/admin')
    } catch {
      const msg = 'Error de conexión con el servidor.'
      setErrorMsg(msg)
      toast({
        title: 'Sin conexión',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <main className="p-5">
      <CardHeader className="flex items-center justify-center p-5">
        <UserX className="w-10 h-10"></UserX>
        <CardTitle>Eliminar usuario de la BBDD</CardTitle>
      </CardHeader>
      <Card className="rounded-2xl shadow-accent">
        <CardHeader className="flex-col items-center justify-center">
          <CardTitle className="text-center">Buscar usuario a eliminar</CardTitle>
          <p className="text-xs text-center text-muted-foreground">
            Localiza el usuario por DNI y confirma la eliminación escribiendo su DNI completo.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSearch()
            }}
            className="flex items-center justify-center"
          >
            <Input
              value={dniQuery}
              onChange={(e) => setDniQuery(e.target.value)}
              placeholder="DNI del usuario"
            />

            <div className="flex gap-2">
              <Button type="submit" variant="ghost" disabled={loadingUser || !dniQuery.trim()}>
                {loadingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                <Search></Search>
                Buscar
              </Button>

              {user && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-sm"
                  onClick={() => router.push(`/admin/list?id=${encodeURIComponent(user.id)}`)}
                >
                  Ver información
                </Button>
              )}
            </div>
          </form>
        </CardHeader>

        {errorMsg && (
          <Alert variant="destructive" className="rounded-sm">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {!user ? (
          <p className="flex items-center justify-center text-xs text-muted-foreground">
            Busca un usuario por su DNI para poder eliminarlo. Esta acción solo está disponible
            usuarios <span className="font-semibold">Administradores</span>.
          </p>
        ) : (
          <div className="flex-col items-center justify-center space-y-4">
            <div className="text-center grid gap-3">
              <div className="rounded-sm border bg-card p-3 text-card-foreground flex flex-col gap-1">
                <div className="text-xs font-bold text-animate">USUARIO PARA ELIMINAR</div>
                <div className="text-base font-semibold">
                  {user.apellidos}, {user.nombre}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">
                    {user.rol === 'admin'
                      ? 'Administrador'
                      : user.rol === 'bf'
                        ? 'Bombero Forestal'
                        : 'Jefe de Retén'}
                  </span>
                </div>

                {user.dni && (
                  <div className="text-xs">
                    DNI: <span className="font-mono font-semibold">{user.dni}</span>
                  </div>
                )}
              </div>

              <div className="rounded-sm border bg-card p-3 text-card-foreground space-y-1">
                <div className="text-xs font-bold text-animate">DESTINO</div>

                {unidad ? (
                  <>
                    <div className="text-xs font-medium">Unidad: {unidad.nombre}</div>
                    <div className="text-xs text-muted-foreground">Zona: {unidad.zona}</div>
                  </>
                ) : caseta ? (
                  <>
                    <div className="text-xs font-medium">Caseta: {caseta.nombre}</div>

                    {municipio && (
                      <div className="text-xs text-muted-foreground">
                        Municipio: {municipio.nombre} ({municipio.zona})
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Sin adscripción registrada.</div>
                )}
              </div>
            </div>

            <Alert variant="destructive" className="max-w-xl mx-auto mt-4 flex gap-3 items-start">
              <ShieldAlert className="mt-1 h-5 w-5" />

              <div>
                <AlertTitle className="text-xl font-bold">Acción irreversible</AlertTitle>

                <AlertDescription className="mt-2 space-y-3 ">
                  <p className=" font-bold text-red-400">
                    Esta operación eliminará al usuario del sistema y también su cuenta de acceso.
                  </p>

                  {user.rol === 'admin' && (
                    <p className="mt-1 font-semibold">
                      Atención: no se recomienda eliminar usuarios administradores.
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-bold text-red-400">
                      Para confirmar, escribe el DNI completo del usuario:
                    </label>

                    <Input
                      value={confirmDni}
                      onChange={(e) => setConfirmDni(e.target.value)}
                      className="h-10 rounded-sm font-bold"
                    />

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-sm"
                        disabled={!canDelete}
                        onClick={handleDelete}
                      >
                        {loadingDelete ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Eliminando…
                          </>
                        ) : (
                          <>
                            <Trash2 />
                            Eliminar usuario
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}
        <div className="flex items-center justify-center">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft></ArrowLeft>
            Volver al listado
          </Button>
        </div>
      </Card>
    </main>
  )
}
