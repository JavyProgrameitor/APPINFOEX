'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

const links = [{ href: '/bf/list', label: 'Listar' }]

export function SidebarBF({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <aside
      className={cn(
        // Misma línea visual que el Navbar: fondo más claro, borde blanco grueso
        'hidden md:block w-64 shrink-0 bg-[--card]/95 text-[--sidebar-foreground] ' +
          'border-r-10 border-white-90 shadow-md backdrop-blur-md ' +
          'sticky top-0 h-screen',
        className,
      )}
    >
      {/* Cabecera del sidebar */}
      <div className="p-4 font-bold tracking-tight text-xl border-b-2 border-white/60">
        BOMBERO FORESTAL
      </div>

      {/* Navegación */}
      <nav className="px-3 py-3 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                  'text-[--sidebar-foreground]/90 hover:bg-[--sidebar-accent]/80 hover:text-[--sidebar-accent-foreground] ' +
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--sidebar-ring] focus-visible:ring-offset-2',
                active
                  ? 'bg-[--sidebar-accent]/90 text-[--sidebar-accent-foreground] shadow-inner'
                  : 'text-[--sidebar-foreground]/80',
              )}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
