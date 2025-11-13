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

  useEffect(() => {
    fetchMe({ redirectOn401: true })
  }, [fetchMe])

  useEffect(() => {
    fetchMe({ redirectOn401: isRoleRoute })
    setOpen(false)
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
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
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
        {/* 3 columnas reales: izquierda (hamburguesa), centro (título), derecha (acciones) */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 h-14">
          {/* Izquierda: hamburguesa (solo móvil) */}
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>

          {/* Centro: logo + título centrados y truncados (no solapa nunca) */}
          <div className="min-w-0 justify-self-center">
            <Link href="/" className="flex items-center gap-2 max-w-full">
              <Image
                src="/img/logoGreen.svg"
                alt="INFOEX"
                width={28}
                height={28}
                className="rounded-lg object-cover shrink-0"
                priority
              />
              <span
                className="truncate font-black leading-tight
                           text-base sm:text-lg md:text-xl"
                title="APP CONTROL-DIARIO"
              >
                APP CONTROL-DIARIO
              </span>
            </Link>
          </div>

          {/* Derecha: acciones desktop */}
          <div className="hidden md:flex items-center gap-2 justify-self-end">
            {isRoleRoute && !loading && email && (
              <span className="flex text-sm items-center gap-2 px-3 py-1 rounded-xl border border-/40">
                <span className="inline-flex items-center gap-1">
                  <span className="rounded-full w-2 h-2 bg-destructive" />
                  <span className="font-semibold">{roleLabel(rol)}</span>
                </span>
                <span className="text-primary/70">✓</span>
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
        </div>

        {/* Panel móvil colapsable */}
        <div
          className={[
            'md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
            open ? 'max-h-[60dvh] opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
          aria-hidden={!open}
        >
          <div className="border-t py-2">
            <div className="flex items-center justify-between gap-2">
              {isRoleRoute && !loading && email && (
                <span className="text-xs inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-amber/40 bg-white/10 ">
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded-full w-2 h-2 bg-destructive" />
                    <span className="font-semibold">{roleLabel(rol)}</span>
                  </span>
                  <span className="text-primary/70">✓</span>
                  <span className="opacity-80">{email}</span>
                </span>
              )}

              <div className="flex items-center gap-2">
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
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
