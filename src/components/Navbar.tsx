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

  const isRoleRoute = useMemo(
    () =>
      pathname?.startsWith('/admin') || pathname?.startsWith('/bf') || pathname?.startsWith('/jr'),
    [pathname],
  )

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
        const res = await fetch('/supabase/me', {
          method: 'GET',
          credentials: 'include',
        })
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

  useEffect(() => {
    fetchMe({ redirectOn401: true })
  }, [fetchMe])

  useEffect(() => {
    fetchMe({ redirectOn401: isRoleRoute })
  }, [fetchMe, isRoleRoute, pathname])

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
      await fetch('/supabase/logout', { method: 'POST', credentials: 'include' })
    } catch {}
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
    <header className="sticky top-0 z-50 w-full border-8 bg-[--card]/90 backdrop-blur supports-backdrop-filter:bg-[--card]/80">
      <nav className="mx-auto max-w-6xl px-3 sm:px-4">
        {/* Contenedor principal: logo a la izquierda, acciones/hamburguesa a la derecha */}
        <div className="flex items-center justify-evenly h-14">
          {/* Izquierda: logo + título */}
          <div className="min-w-0">
            <Link href="/" className="flex items-center gap-2 max-w-full">
              <Image
                src="/img/logoGreen.svg"
                alt="INFOEX"
                width={28}
                height={28}
                className="h-10 w-auto rounded-lg object-cover shrink-0"
              />
              <span
                className="truncate font-black leading-tight text-base sm:text-lg md:text-xl"
                title="APP CONTROL-DIARIO"
              >
                APP CONTROL-DIARIO
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Acciones desktop */}
            <div className="hidden md:flex items-center gap-2">
              {isRoleRoute && !loading && email && (
                <span className="flex text-sm items-center gap-2 px-3 py-1 rounded-xl border-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded-full w-3 h-3 bg-destructive" />
                    <span className="font-black">{roleLabel(rol)}</span>
                  </span>
                  <span className="text-green-600">✓</span>
                  <span className="opacity-80 font-semibold">{email}</span>
                </span>
              )}

              {isRoleRoute && !loading && email && (
                <Button size="sm" variant="destructive" onClick={onLogout}>
                  Salir
                </Button>
              )}

              <Button
                variant="ghost"
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

            {/* Hamburguesa móvil a la derecha */}
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {/* Panel móvil (solo se renderiza cuando está abierto) */}
        {open && (
          <div id="mobile-menu" className="md:hidden overflow-hidden border-t py-2 cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              {isRoleRoute && !loading && email && (
                <span className="text-xs inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-amber/40 bg-white/10 ">
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded-full w-2 h-2 bg-destructive cursor-pointer" />
                    <span className="font-semibold">{roleLabel(rol)}</span>
                  </span>
                  <span className="text-primary/70">✓</span>
                  <span className="opacity-80">{email}</span>
                </span>
              )}

              <div className="flex items-center gap-2">
                {isRoleRoute && !loading && email && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={onLogout}
                  >
                    Salir
                  </Button>
                )}
                <Button
                  variant="ghost"
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
        )}
      </nav>
    </header>
  )
}
