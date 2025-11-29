'use client'

import { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, UserRoundPlus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'

type Rol = 'bf' | 'jr'

type ParsedUser = {
  email: string
  nombre?: string | null
  apellidos?: string | null
  dni?: string | null
  rol?: Rol
  unidadNombre?: string | null
}

// email;nombre;apellidos;dni;rol;unidad
function parseUsersFromText(text: string): ParsedUser[] {
  const lines = text.split(/\r?\n/)
  const users: ParsedUser[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) continue

    const [emailRaw, nombreRaw, apellidosRaw, dniRaw, rolRaw, unidadRaw] = line
      .split(';')
      .map((v) => v?.trim() || '')

    if (!emailRaw) {
      throw new Error(`Línea inválida: "${line}". Debe tener al menos el email (primer campo).`)
    }

    if (!unidadRaw) {
      throw new Error(
        `Línea inválida: "${line}". Falta la unidad en la sexta columna (email;nombre;apellidos;dni;rol;unidad).`,
      )
    }

    let rol: Rol | undefined
    if (rolRaw) {
      const lower = rolRaw.toLowerCase()
      if (lower === 'bf' || lower === 'jr') {
        rol = lower as Rol
      } else {
        throw new Error(
          `Rol inválido en línea "${line}". Usa solo bf (bombero) o jr (jefe de retén).`,
        )
      }
    }

    users.push({
      email: emailRaw,
      nombre: nombreRaw || null,
      apellidos: apellidosRaw || null,
      dni: dniRaw || null,
      rol,
      unidadNombre: unidadRaw || null,
    })
  }

  return users
}

export default function AdminBulkAddPage() {
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [defaultPassword, setDefaultPassword] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [results, setResults] = useState<{ email: string; ok: boolean; message?: string }[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null)
    setError(null)
    setParsedUsers(null)
    setResults([])

    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const users = parseUsersFromText(text)
        setParsedUsers(users)
        setStatus(`Detectados ${users.length} usuarios en el archivo.`)
      } catch (e: any) {
        setError(e.message || 'Error al procesar el archivo.')
      }
    }

    reader.onerror = () => {
      setError('No se ha podido leer el archivo.')
    }

    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!parsedUsers || parsedUsers.length === 0) {
      setError('No hay usuarios para importar.')
      return
    }

    if (!defaultPassword || defaultPassword.trim().length < 6) {
      setError('Debes indicar una contraseña por defecto (mínimo 6 caracteres).')
      return
    }

    setIsImporting(true)
    setStatus('Iniciando importación...')
    setError(null)
    setResults([])

    try {
      const newResults: { email: string; ok: boolean; message?: string }[] = []

      for (const user of parsedUsers) {
        setStatus(`Importando ${user.email}...`)

        try {
          const res = await fetch('/supabase/admin/crear-usuarios', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              password: defaultPassword,
              rol: user.rol ?? 'bf',
              dni: user.dni || undefined,
              nombre: user.nombre || undefined,
              apellidos: user.apellidos || undefined,
              // clave: mandamos el nombre de unidad al backend
              unidad_nombre: user.unidadNombre || undefined,
            }),
          })

          const data = await res.json().catch(() => ({}))

          if (!res.ok) {
            const rawMsg =
              (data && (data.error || data.message)) || 'Error desconocido al crear el usuario'
            const msg = String(rawMsg)
            const lower = msg.toLowerCase()

            const isDuplicate =
              lower.includes('ya existe') || lower.includes('already') || lower.includes('duplic')

            if (isDuplicate) {
              newResults.push({
                email: user.email,
                ok: true,
                message: 'Usuario ya existía, se ha omitido.',
              })
            } else {
              throw new Error(msg)
            }
          } else {
            newResults.push({ email: user.email, ok: true })
          }
        } catch (e: any) {
          newResults.push({
            email: user.email,
            ok: false,
            message: e.message || 'Error en la creación',
          })
        }
      }

      setResults(newResults)

      const okCount = newResults.filter((r) => r.ok).length
      const koCount = newResults.length - okCount

      if (koCount === 0) {
        setStatus(`Importación completada correctamente. Usuarios procesados: ${okCount}.`)
      } else {
        setStatus(`Importación completada con incidencias. OK: ${okCount}, errores: ${koCount}.`)
      }
    } catch (e: any) {
      setError(e.message || 'Error inesperado durante la importación.')
    } finally {
      setIsImporting(false)
    }
  }

  const successes = results.filter((r) => r.ok)
  const failures = results.filter((r) => !r.ok)

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 md:px-0">
      <Card className=" w-full max-w-xl rounded-2xl shadow-accent p-4">
        <CardHeader className="flex items-center justify-center gap-2">
          <UserRoundPlus className="w-10 h-10"></UserRoundPlus>
          <CardTitle>Importación masiva de bomberos </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-secondary font-bold">
            El archivo debe tener una línea por usuario con el siguiente formato:
          </p>

          <pre className="bg-muted text-sm p-3 rounded-md overflow-auto">
            email;nombre;apellidos;dni;rol;unidad o caseta
            {'\n'}
            juan.lopez@example.com;Juan;López;12345678A;bf;Talayuela B
          </pre>

          <p className="text-sm text-muted-foreground">
            • Las columnas <strong>nombre</strong>, <strong>apellidos</strong>, <strong>dni</strong>{' '}
            y <strong>rol</strong> son opcionales.
            {'\n'}• Si no indicas rol, se usará <strong>bf</strong> (bombero forestal) por defecto.
            {'\n'}• La sexta columna (<strong>unidad</strong>) es obligatoria y debe coincidir con
            nombre de la unidad o la caseta en la base de datos.
            {'\n'}• <strong>No</strong> existen jefes de servicios en casetas.
            {'\n'}• Roles válidos: <code>bf</code> (bombero forestal) y <code>jr</code> (jefe de
            retén).
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Archivo de texto (.txt, .csv)</label>
            <Input type="file" accept=".txt,.csv" onChange={handleFileChange} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Contraseña por defecto para todos los usuarios
            </label>
            <Input
              type="password"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="Ej: Infoex2025!"
              className="text-sm text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground">
              Esta contraseña se asignará inicialmente a todos los usuarios creados desde este
              archivo. Después podrán cambiarla.
            </p>
          </div>

          {status && (
            <Alert className="border-green-500/60">
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>Estado</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {parsedUsers && parsedUsers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1">
                <Upload className="w-4 h-4" />
                Previsualización (primeras 10 líneas)
              </p>
              <ul className="text-xs bg-muted rounded-md p-3 space-y-1 max-h-40 overflow-auto">
                {parsedUsers.slice(0, 10).map((u, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{u.email}</span> — {u.nombre} {u.apellidos}{' '}
                    {u.dni ? `(${u.dni})` : ''}
                    {u.rol ? ` [rol: ${u.rol}]` : ' [rol: bf por defecto]'}
                    {u.unidadNombre ? ` — unidad: ${u.unidadNombre}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Resultado de la importación</p>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div className="bg-green-50 dark:bg-green-950/40 rounded-md p-3">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Correctos ({successes.length})
                  </p>
                  <ul className="space-y-1">
                    {successes.map((r) => (
                      <li key={r.email}>
                        {r.email}
                        {r.message ? ` — ${r.message}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 rounded-md p-3">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Errores ({failures.length})
                  </p>
                  <ul className="space-y-1">
                    {failures.map((r) => (
                      <li key={r.email}>
                        <span className="font-semibold">{r.email}</span> — {r.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center pt-2">
            <Button
              variant="ghost"
              onClick={handleImport}
              disabled={!parsedUsers || parsedUsers.length === 0 || isImporting}
              className="w-36 md:w-48 py-2 rounded-xl font-medium"
            >
              {isImporting ? 'Importando...' : 'Importar usuarios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
