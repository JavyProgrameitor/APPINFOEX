// src/app/bf/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowRight, ArrowLeft, HomeIcon } from 'lucide-react'

type Rol = 'admin' | 'bf' | 'jr'

export default function BFHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rol, setRol] = useState<Rol | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/supabase/me', { credentials: 'include' })
        if (res.status !== 200) {
          router.replace('/')
          return
        }

        const me = await res.json()

        // Solo permitimos acceder a esta pantalla a BF y JR
        const allowedRoles: Rol[] = ['bf', 'jr']
        if (!allowedRoles.includes(me.rol)) {
          router.replace('/')
          return
        }

        setRol(me.rol as Rol)
      } catch (e) {
        router.replace('/')
        return
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  if (loading) return null

  const goBFList = () => {
    router.push('/bf/list')
  }

  const goJRHome = () => {
    router.push('/jr')
  }

  return (
    <main className="flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-xl rounded-2xl shadow-lg">
        <CardHeader className="flex flex-col items-center text-center space-y-2">
          <HomeIcon className="w-10 h-10"></HomeIcon>
          <CardTitle className="text-xl md:text-2xl tracking-wide">
            BIENVENIDO BOMBERO FORESTAL DE EXTREMADURA
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center text-sm md:text-base">
          <div className="space-y-2">
            <p>
              Has accedido correctamente a la aplicación de INFOEX. Desde el menú lateral puedes:
            </p>

            <ul className="space-y-1 text-muted-foreground">
              <li>• Registrar o consultar partes de actuación.</li>
              <li>• Revisar avisos y comunicaciones.</li>
              <li>• Acceder a tu perfil y cambiar la contraseña.</li>
            </ul>

            <p className="text-xs md:text-sm text-muted-foreground mt-3">
              Si tienes cualquier incidencia con la aplicación, comunícalo a tu Jefe de Retén o al
              servicio de soporte.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            {/* Solo mostramos este botón si el usuario también es JR */}
            {rol === 'jr' && (
              <Button variant="ghost" onClick={goJRHome}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Ir al panel de Jefe de Servicio
              </Button>
            )}
            {/* Botón siempre disponible para continuar como BF */}
            <Button variant="ghost" onClick={goBFList}>
              Continuar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
