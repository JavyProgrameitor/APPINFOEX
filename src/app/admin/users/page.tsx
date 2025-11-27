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

  // NUEVO: flujo por zona -> (unidad|caseta)
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

  // Validación de selección (ahora requiere zona)
  const seleccionValida = useMemo(() => {
    if (!zona) return false
    if (asignacionTipo === 'unidad') return !!unidadId
    if (asignacionTipo === 'caseta') return !!casetaId
    return false
  }, [zona, asignacionTipo, unidadId, casetaId])

  // Reset dependientes
  useEffect(() => {
    // Cambiar zona limpia selección de unidad/caseta
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
    <main className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-xl rounded-2xl shadow-accent">
        <CardHeader className="flex items-center justify-center">
          <UserRoundPlus />
          <CardTitle className="text-center text-animate">Agregar usuario en la BBDD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl mx-auto space-y-4">
            {alert && (
              <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertTitle>{alert.type === 'error' ? 'Error' : 'Listo'}</AlertTitle>
                <AlertDescription>{alert.msg}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-center">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-sm m-1">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm m-1">Contraseña</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <p className="text-xs mt-1 text-primary">Mínimo 6 caracteres.</p>
                </div>

                {/* Rol */}
                <div>
                  <Select
                    value={form.rol}
                    onValueChange={(v) => setForm({ ...form, rol: v as Rol })}
                  >
                    <SelectTrigger className="w-80 rounded-sm shadow-accent">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent className="rounded-b-xl">
                      <SelectItem value="admin" className="text-center">
                        Administrador
                      </SelectItem>
                      <SelectItem value="bf" className="text-center">
                        Bombero Forestal
                      </SelectItem>
                      <SelectItem value="jr" className="text-center">
                        Jefe de Servicio
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className=" text-sm">DNI</label>
                  <Input
                    type="text"
                    value={form.dni}
                    onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm">Nombre</label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className=" text-sm">Apellidos</label>
                  <Input
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  />
                </div>

                {/* Zona */}
                <div>
                  <Select value={zona} onValueChange={(v) => setZona(v)}>
                    <SelectTrigger className="w-80 rounded-sm shadow-accent">
                      <SelectValue placeholder="Elige una zona" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xs max-h-64">
                      {zonas.map((z) => (
                        <SelectItem key={z} value={z} className="text-center">
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asignación por Unidad o Caseta */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">Asignar por</label>
                    <Select
                      value={asignacionTipo}
                      onValueChange={(v) => {
                        const value = v as AsignacionTipo | ''
                        setAsignacionTipo(value)
                        setUnidadId('')
                        setCasetaId('')
                      }}
                      disabled={!zona}
                    >
                      <SelectTrigger className="w-full rounded-sm shadow-accent">
                        <SelectValue placeholder={zona ? '— Selecciona —' : 'Primero elige zona'} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xs">
                        <SelectItem value="unidad" className="text-center">
                          Unidad
                        </SelectItem>
                        <SelectItem value="caseta" className="text-center">
                          Caseta
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {asignacionTipo === 'unidad' && (
                    <div>
                      <label className="block text-sm mb-1">Unidad</label>
                      <Select
                        value={unidadId}
                        onValueChange={(v) => setUnidadId(v)}
                        disabled={!zona}
                      >
                        <SelectTrigger className="w-full rounded-sm shadow-accent">
                          <SelectValue
                            placeholder={zona ? '— Selecciona unidad —' : 'Primero elige zona'}
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xs max-h-64">
                          {unidadesEnZona.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-center">
                              {u.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {asignacionTipo === 'caseta' && (
                    <div>
                      <label className="block text-sm mb-1">Caseta</label>
                      <Select
                        value={casetaId}
                        onValueChange={(v) => setCasetaId(v)}
                        disabled={!zona}
                      >
                        <SelectTrigger className="w-full rounded-sm shadow-accent">
                          <SelectValue
                            placeholder={zona ? '— Selecciona caseta —' : 'Primero elige zona'}
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xs max-h-64">
                          {casetasEnZona.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-center">
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Mensajes de ayuda/validación */}
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
                <div className="flex items-center justify-center">
                  <Button variant="ghost" type="submit" disabled={loading || !seleccionValida}>
                    {loading ? 'Creando...' : 'Crear usuario'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
