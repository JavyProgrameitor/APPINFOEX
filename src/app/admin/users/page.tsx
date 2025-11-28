'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Use-toast'
import { getSupabaseBrowser } from '@/server/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { UserRoundPlus } from 'lucide-react'
import { useErrorToast } from '@/lib/useErrorToast'

type Rol = 'admin' | 'bf' | 'jr'
type AsignacionTipo = 'unidad' | 'caseta'

type Unidad = { id: string; nombre: string; zona: string }
type Municipio = { id: string; nombre: string; zona: string }
type Caseta = { id: string; nombre: string; municipio_id: string }

export default function AdminUsersPage() {
  const { toast } = useToast()

  const [form, setForm] = useState({
    email: '',
    password: '',
    rol: 'bf' as Rol,
    dni: '',
    nombre: '',
    apellidos: '',
  })

  // flujo por zona -> (unidad|caseta)
  const [zona, setZona] = useState<string>('')
  const [asignacionTipo, setAsignacionTipo] = useState<AsignacionTipo | ''>('')
  const [unidadId, setUnidadId] = useState<string>('')
  const [casetaId, setCasetaId] = useState<string>('')

  // Opciones desde BBDD
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [casetas, setCasetas] = useState<Caseta[]>([])
  const showAuthError = useErrorToast('form')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{
    type: 'success' | 'error'
    msg: string
  } | null>(null)

  // Cargar unidades, municipios y casetas
  useEffect(() => {
    const supa = getSupabaseBrowser()
    ;(async () => {
      const [{ data: u }, { data: m }, { data: c }] = await Promise.all([
        supa.from('unidades').select('id,nombre,zona').order('nombre'),
        supa.from('municipios').select('id,nombre,zona').order('nombre'),
        supa.from('casetas').select('id,nombre,municipio_id').order('nombre'),
      ])
      setUnidades((u as Unidad[]) || [])
      setMunicipios((m as Municipio[]) || [])
      setCasetas((c as Caseta[]) || [])
    })()
  }, [])

  // Zonas disponibles (de unidades y municipios)
  const zonas = useMemo(() => {
    const z = new Set<string>()
    for (const u of unidades) z.add(u.zona)
    for (const m of municipios) z.add(m.zona)
    return Array.from(z).sort()
  }, [unidades, municipios])

  // Lookups
  const municipioById = useMemo(() => new Map(municipios.map((m) => [m.id, m])), [municipios])

  // Filtrado por zona
  const unidadesEnZona = useMemo(
    () => unidades.filter((u) => (zona ? u.zona === zona : true)),
    [unidades, zona],
  )

  const casetasEnZona = useMemo(
    () =>
      casetas.filter((c) => {
        if (!zona) return true
        const mun = municipioById.get(c.municipio_id)
        return mun?.zona === zona
      }),
    [casetas, zona, municipioById],
  )

  // Validación de selección (requiere zona)
  const seleccionValida = useMemo(() => {
    if (!zona) return false
    if (asignacionTipo === 'unidad') return !!unidadId
    if (asignacionTipo === 'caseta') return !!casetaId
    return false
  }, [zona, asignacionTipo, unidadId, casetaId])

  // Reset dependientes al cambiar zona
  useEffect(() => {
    setUnidadId('')
    setCasetaId('')
  }, [zona])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAlert(null)

    try {
      if (!zona) {
        throw new Error('Debes seleccionar una Zona.')
      }
      if (!asignacionTipo) {
        throw new Error('Debes seleccionar “Asignar por” (Unidad o Caseta).')
      }
      if (!seleccionValida) {
        throw new Error(
          asignacionTipo === 'unidad'
            ? 'Debes seleccionar una Unidad.'
            : 'Debes seleccionar una Caseta.',
        )
      }

      // REGLAS DE NEGOCIO (doble seguridad)
      // 1) Los jefes de retén (jr) solo en unidades, nunca en casetas
      if (form.rol === 'jr' && asignacionTipo === 'caseta') {
        throw new Error('Los jefes de retén solo pueden asignarse a unidades, no a casetas.')
      }

      // 2) En casetas solo puede haber Bomberos Forestales
      if (asignacionTipo === 'caseta' && form.rol !== 'bf') {
        throw new Error('Solo los Bomberos Forestales pueden asignarse a una caseta.')
      }

      const supa = getSupabaseBrowser()
      const {
        data: { session },
      } = await supa.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/supabase/admin/crear-usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          rol: form.rol,
          dni: form.dni?.trim() || undefined,
          nombre: form.nombre?.trim() || undefined,
          apellidos: form.apellidos?.trim() || undefined,
          // La zona no se inserta en usuarios; va implícita por la unidad/caseta elegida
          unidad_id: asignacionTipo === 'unidad' ? unidadId : undefined,
          caseta_id: asignacionTipo === 'caseta' ? casetaId : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error desconocido')

      toast({ title: 'Usuario creado', description: 'Se creó correctamente.' })
      setAlert({ type: 'success', msg: 'Usuario creado correctamente.' })

      // Reset
      setForm({
        email: '',
        password: '',
        rol: 'bf',
        dni: '',
        nombre: '',
        apellidos: '',
      })
      setZona('')
      setAsignacionTipo('')
      setUnidadId('')
      setCasetaId('')
    } catch (err) {
      showAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl rounded-2xl shadow-lg p-8">
        <CardHeader className="flex items-center justify-center space-y-2">
          <UserRoundPlus className="w-10 h-10 " />
          <CardTitle>Agregar usuario a la BBDD</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* ALERTA */}
            {alert && (
              <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertTitle>{alert.type === 'error' ? 'Error' : 'Listo'}</AlertTitle>
                <AlertDescription>{alert.msg}</AlertDescription>
              </Alert>
            )}

            {/* FORMULARIO */}
            <form onSubmit={onSubmit} className="space-y-5 max-w-sm mx-auto w-full">
              {/* Email */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  className="w-full"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  className="w-full"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <p className="text-xs mt-1 text-primary">Mínimo 6 caracteres.</p>
              </div>

              {/* Rol */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Rol</label>
                <Select
                  value={form.rol}
                  onValueChange={(v) => {
                    const rol = v as Rol
                    setForm({ ...form, rol })

                    // Si pasa a JR y estaba asignado por caseta, forzamos a unidad e informamos
                    if (rol === 'jr' && asignacionTipo === 'caseta') {
                      setAsignacionTipo('unidad')
                      setCasetaId('')
                      toast({
                        title: 'Revisar asignación',
                        description:
                          'Los jefes de retén solo pueden asignarse a unidades. Se ha cambiado la asignación a unidad.',
                        variant: 'destructive',
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-full rounded-md shadow text-animate">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="bf">Bombero Forestal</SelectItem>
                    <SelectItem value="jr">Jefe de Servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DNI */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">DNI</label>
                <Input
                  className="w-full"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                />
              </div>

              {/* Nombre */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  className="w-full"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              {/* Apellidos */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Apellidos</label>
                <Input
                  className="w-full"
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                />
              </div>

              {/* Zona */}
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Zona</label>
                <Select value={zona} onValueChange={setZona}>
                  <SelectTrigger className="w-full rounded-md shadow text-animate">
                    <SelectValue placeholder="Elige una zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonas.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asignación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium">Asignar por</label>
                  <Select
                    value={asignacionTipo}
                    onValueChange={(v) => {
                      const value = v as AsignacionTipo | ''

                      // Si intenta elegir caseta con rol jr, informamos y NO cambiamos
                      if (value === 'caseta' && form.rol === 'jr') {
                        toast({
                          title: 'Asignación no válida',
                          description:
                            'Los jefes de retén solo pueden asignarse a unidades, no a casetas.',
                          variant: 'destructive',
                        })
                        return
                      }

                      setAsignacionTipo(value)
                      setUnidadId('')
                      setCasetaId('')
                    }}
                    disabled={!zona}
                  >
                    <SelectTrigger className="w-full rounded-md shadow">
                      <SelectValue placeholder={zona ? 'Seleccionar' : 'Primero elige zona'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="caseta">Caseta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {asignacionTipo === 'unidad' && (
                  <div className="flex flex-col space-y-1">
                    <label className="text-animate font-medium">Unidad</label>
                    <Select value={unidadId} onValueChange={setUnidadId} disabled={!zona}>
                      <SelectTrigger className="w-full rounded-md shadow">
                        <SelectValue placeholder="Selecciona unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesEnZona.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {asignacionTipo === 'caseta' && (
                  <div className="flex flex-col space-y-1">
                    <label className="text-animate font-medium">Caseta</label>
                    <Select value={casetaId} onValueChange={setCasetaId} disabled={!zona}>
                      <SelectTrigger className="w-full rounded-md shadow">
                        <SelectValue placeholder="Selecciona caseta" />
                      </SelectTrigger>
                      <SelectContent>
                        {casetasEnZona.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Validación */}
              {zona && !asignacionTipo && (
                <p className="text-xs text-red-600">Selecciona si asignas por Unidad o Caseta.</p>
              )}

              {zona && asignacionTipo && !seleccionValida && (
                <p className="text-xs text-red-600">
                  {asignacionTipo === 'unidad'
                    ? 'Debes seleccionar una Unidad.'
                    : 'Debes seleccionar una Caseta.'}
                </p>
              )}

              {/* Submit */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  type="submit"
                  disabled={loading || !seleccionValida}
                  className="w-36 md:w-48 py-2 rounded-xl font-medium"
                >
                  {loading ? 'Creando...' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
