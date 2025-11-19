'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname, useSearchParams } from 'next/navigation'
import { Calendar, FileText, Home, Users, UserX } from 'lucide-react'

const links = [
  { href: '/admin', label: 'Listar Bomberos', icon: Home },
  { href: '/admin/list', label: 'Datos personales', icon: FileText },
  { href: '/admin/month', label: 'Resumen mensual', icon: Calendar },
  { href: '/admin/users', label: 'Agregar bombero', icon: Users },
  { href: '/admin/delete', label: 'Eliminar bombero', icon: UserX },
]

export function SidebarAdmin({ className }: { className?: string }) {
  const pathname = usePathname()
  const params = useSearchParams()

  // si hay id en la URL, lo mantenemos
  const id = params.get('id')
  const suffix = id ? `?id=${id}` : ''

  return (
    <aside
      className={cn(
        'hidden md:block w-64 shrink-0 bg-[--card]/95 text-[--sidebar-foreground] ' +
          'border-r-10 border-white-90 shadow-md backdrop-blur-md ' +
          'sticky top-0 h-[calc(100vh-56px)]',
        className,
      )}
    >
      <div className="p-4 font-black tracking-tight text-xl border-b-2 border-white/60">
        ADMINISTRACIÓN
      </div>

      <nav className="px-3 py-3 space-y-2">
        {links.map((l) => {
          const fullHref = `${l.href}${suffix}`
          const active = pathname === l.href

          return (
            <Link
              key={l.href}
              href={fullHref}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
                'shadow-[0_1px_6px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.45)]',
                active
                  ? 'bg-primary text-primary-foreground shadow-[0_6px_20px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]'
                  : 'bg-background/70 text-foreground/80 hover:bg-muted/70 dark:text-foreground/70 dark:hover:bg-muted/50',
                !active &&
                  'hover:translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)]',
              )}
            >
              <l.icon
                className={cn(
                  'size-6 shrink-0 transition-all duration-200 stroke-yellow-500 ring-1 bg-destructive rounded-sm p-0.5',
                  active ? 'scale-110' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105',
                )}
              />
              <span className="truncate">{l.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
