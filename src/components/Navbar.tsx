// src/components/NavBar.tsx
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from 'next-themes'

type Rol = 'admin' | 'jr' | 'bf' | null

export default function NavBar() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [rol, setRol] = useState<Rol>(null)
  const [open, setOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  // rutas que requieren sesión (para redirigir en 401 y mostrar info)
  const isRoleRoute = useMemo(
    () =>
      pathname?.startsWith('/admin') || pathname?.startsWith('/bf') || pathname?.startsWith('/jr'),
    [pathname],
  )

  // tema
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isLight = mounted ? theme === 'light' : null

  const justLoggedOutRef = useRef(false)

  const fetchMe = useCallback(
    async (opts?: { redirectOn401?: boolean }) => {
      if (justLoggedOutRef.current) {
        justLoggedOutRef.current = false
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/me', { method: 'GET', credentials: 'include' })
        if (res.status === 200) {
          const json = await res.json()
          setEmail(json.email)
          setRol(json.rol as Rol)
        } else if (res.status === 401) {
          setEmail(null)
          setRol(null)
          if (opts?.redirectOn401 && pathname !== '/') router.replace('/')
        } else {
          setEmail(null)
          setRol(null)
        }
      } catch {
        setEmail(null)
        setRol(null)
      } finally {
        setLoading(false)
      }
    },
    [router, pathname],
  )

  // 1) al montar
  useEffect(() => {
    fetchMe({ redirectOn401: true })
  }, [fetchMe])

  // 2) al cambiar ruta → revisa sesión y cierra panel móvil
  useEffect(() => {
    fetchMe({ redirectOn401: isRoleRoute })
    setOpen(false)
  }, [fetchMe, isRoleRoute, pathname])

  // 3) cuando la pestaña vuelve a estar visible
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchMe({ redirectOn401: isRoleRoute })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [fetchMe, isRoleRoute])

  const onLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    } catch {
      /* ignore */
    }
    justLoggedOutRef.current = true
    setEmail(null)
    setRol(null)
    router.replace('/')
  }

  const roleLabel = (r: Rol) => {
    if (!r) return ''
    if (r === 'admin') return 'Administrador'
    if (r === 'jr') return 'Jefe de Retén'
    return 'Bombero Forestal'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-8 bg-[--card]/90 backdrop-blur supports-[backdrop-filter]:bg-[--card]/80">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Barra superior en grid para centrar el título */}
        <div className="h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Columna izquierda (espaciador para centrar) */}
          <div className="hidden md:block" />

          {/* Centro: Logo + título centrados */}
          <Link href="/" className="justify-self-center flex items-center gap-2">
            <Image
              src="/img/logoGreen.svg"
              alt="INFOEX"
              width={32}
              height={32}
              className="rounded-lg object-cover"
              priority
            />
            <span className="text-sm font-bold whitespace-nowrap">APP CONTROL-DIARIO</span>
          </Link>

          {/* Derecha: acciones desktop */}
          <div className="hidden md:flex items-center gap-2 justify-self-end">
            {isRoleRoute && !loading && email && (
              <span className="flex text-sm items-center gap-2 px-3 py-1 rounded-xl border border-white/40 bg-white/10">
                <span className="inline-flex items-center gap-1">
                  <span className="rounded-full w-2 h-2 bg-card" />
                  <span className="font-medium">{roleLabel(rol)}</span>
                </span>
                <span className="text-primary opacity-70">✓</span>
                <span className="opacity-80">{email}</span>
              </span>
            )}

            {isRoleRoute && !loading && email && (
              <Button size="sm" variant="destructive" onClick={onLogout}>
                Salir
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => mounted && setTheme(isLight ? 'dark' : 'light')}
              aria-label="Cambiar tema"
              suppressHydrationWarning
            >
              {!mounted ? (
                <span className="inline-block w-4 h-4" />
              ) : isLight ? (
                <Moon size={16} />
              ) : (
                <Sun size={16} />
              )}
            </Button>
          </div>

          {/* Botón hamburguesa (móvil) en la derecha */}
          <div className="md:hidden justify-self-end">
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {/* Panel móvil colapsable (sin enlaces de navegación) */}
        <div
          className={[
            'md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
            open ? 'max-h-[60dvh] opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
          aria-hidden={!open}
        >
          <div className="border-t py-2">
            {/* Info y acciones en móvil */}
            <div className="flex items-center justify-between gap-2">
              {isRoleRoute && !loading && email && (
                <span className="text-xs inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-white/40 bg-white/10">
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded-full w-2 h-2 bg-card" />
                    <span className="font-medium">{roleLabel(rol)}</span>
                  </span>
                  <span className="text-primary opacity-70">✓</span>
                  <span className="opacity-80">{email}</span>
                </span>
              )}

              <div className="flex items-center gap-2">
                {isRoleRoute && !loading && email && (
                  <Button size="sm" variant="destructive" onClick={onLogout} className="text-xs">
                    Salir
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => mounted && setTheme(isLight ? 'dark' : 'light')}
                  aria-label="Cambiar tema"
                  suppressHydrationWarning
                >
                  {!mounted ? (
                    <span className="inline-block w-4 h-4" />
                  ) : isLight ? (
                    <Moon size={16} />
                  ) : (
                    <Sun size={16} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
