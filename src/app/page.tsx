'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

import './globals.css'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useErrorToast } from '@/lib/useErrorToast'

type Rol = 'admin' | 'jr' | 'bf'

const ROLE_ROUTES: Record<Rol, string> = {
  admin: '/admin',
  jr: '/jr',
  bf: '/bf',
}

export default function AuthPage() {
  const router = useRouter()

  // cliente SOLO en browser
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }, [])

  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const showAuthError = useErrorToast('auth')

  // al montar: si ya hay sesión en el cliente, resolvemos rol y redirigimos
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (!session) return

      const ok = await resolveAndRouteByRole(session.user.id)
      if (!ok) {
        await supabase.auth.signOut()
      }
    })()
  }, [resolveAndRouteByRole, supabase.auth])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function resolveAndRouteByRole(authUserId: string): Promise<boolean> {
    // leemos la tabla users desde el cliente
    const { data: rec, error: roleErr } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (roleErr) {
      setError(`No se pudo verificar tu rol: ${roleErr.message}`)
      return false
    }
    if (!rec?.rol) {
      setError('Tu usuario no tiene rol asignado en INFOEX. Contacta con administración.')
      return false
    }

    const rol = rec.rol as Rol
    const dest = ROLE_ROUTES[rol]
    if (!dest) {
      setError('Rol desconocido. Contacta con administración.')
      return false
    }

    router.replace(dest)
    return true
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })
      if (error) throw error

      if (!data.user?.id) {
        setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
        return
      }

      const ok = await resolveAndRouteByRole(data.user.id)
      if (!ok) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      showAuthError(err)
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="h-130 grid place-items-center">
      <Card className="flex items-center max-w-sm shadow-accent rounded-xl p-8">
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-green-500 text-lg font-black">
                Correo :
              </label>
              <Input
                className="placeholder:font-thin placeholder:text-primary"
                type="email"
                placeholder=" tucorreo@infoex.es "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="pass" className="text-green-500 text-lg font-black">
                Contraseña :
              </label>
              <Input
                className="placeholder:font-thin placeholder:text-primary"
                type="password"
                placeholder="       ***********   "
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-foreground">{error}</p>}

            <Button
              type="submit"
              variant="ghost"
              className="w-full text-sm font-black cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
