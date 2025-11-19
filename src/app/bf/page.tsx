// src/app/bf/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Use-toast'
import { getSupabaseBrowser } from '@/server/client'

export default function BFHome() {
  const router = useRouter()
  const { toast } = useToast()

  const [loadingPage, setLoadingPage] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Comprobar que el usuario está logueado y tiene rol "bf"
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/supabase/me', { credentials: 'include' })
        if (res.status !== 200) {
          router.replace('/')
          return
        }

        const me = await res.json()

        const allowedRoles = ['bf', 'jr'] as const
        if (!allowedRoles.includes(me.rol)) {
          // Si no es bombero forestal ni jefe de retén, lo mandamos fuera
          router.replace('/')
          return
        }
      } catch (e) {
        router.replace('/')
        return
      } finally {
        setLoadingPage(false)
      }
    })()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones básicas
    if (newPass.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPass !== newPass2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase.auth.updateUser({ password: newPass })

      if (error) {
        setError(error.message)
        return
      }

      setNewPass('')
      setNewPass2('')

      toast({
        title: 'Contraseña actualizada',
        description: 'A partir de ahora deberás usar la nueva contraseña para iniciar sesión.',
      })
    } catch {
      setError('No se pudo cambiar la contraseña. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingPage) {
    return (
      <div className="p-4">
        <p>Cargando…</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-96">
      <div className="w-full max-w-md space-y-4">
        <Card className="rounded-2xl shadow-2xl shadow-accent">
          <CardHeader>
            <CardTitle className="text-lg text-center">Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <Input
                  type="password"
                  value={newPass}
                  placeholder="    ********   "
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Repite la nueva contraseña</label>
                <Input
                  type="password"
                  value={newPass2}
                  placeholder="    ********   "
                  onChange={(e) => setNewPass2(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-center gap-2">
                <Button
                  type="submit"
                  className="font-bold border-2 border-lime-50 cursor-pointer transition-colors hover:bg-lime-200 hover:text-lime-900"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar nueva contraseña'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Button
          className="font-bold border-2 border-lime-50 cursor-pointer transition-colors hover:bg-lime-200 hover:text-lime-900"
          onClick={() => router.push('/bf/list')}
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
