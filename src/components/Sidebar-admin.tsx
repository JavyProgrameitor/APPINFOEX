"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { FileText, Home, Users } from "lucide-react";

const links = [
  { href: "/admin", label: "Escritorio", icon: Home },
  { href: "/admin/forms", label: "Formulario", icon: FileText },
  { href: "/admin/users", label: "Agregar-Usuarios", icon: Users },
];

export function SidebarAdmin({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Misma línea visual que el Navbar: fondo más claro, borde blanco grueso
        "hidden md:block w-64 shrink-0 bg-[--card]/95 text-[--sidebar-foreground] " +
          "border-r-10 border-white-90 shadow-md backdrop-blur-md " +
          "sticky top-0 h-[calc(100vh-56px)]",
        className
      )}
    >
      {/* Cabecera del sidebar */}
      <div className="p-4 font-black tracking-tight text-xl border-b-2 border-white/60">
        ADMINISTRACIÓN
      </div>

      {/* Navegación */}
      <nav className="px-3 py-3 space-y-2">
        {links.map((l: { href: string; label: string; icon: LucideIcon }) => {
          const active = pathname === l.href;

          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                // Base: layout + tipografía + accesibilidad
                "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",

                // Sombra SIEMPRE visible (ambos temas) antes del hover
                "shadow-[0_1px_6px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.45)]",

                // Colores por estado
                active
                  ? "bg-primary text-primary-foreground shadow-[0_6px_20px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                  : "bg-background/70 text-foreground/80 hover:bg-muted/70 dark:text-foreground/70 dark:hover:bg-muted/50",

                // Micro-animación en hover (no en activo)
                !active &&
                  "hover:translate-y-[1px] hover:shadow-[0_4px_14px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              )}
            >
              {/* Icono */}
              <l.icon
                className={cn(
                  "size-4 shrink-0 transition-all duration-200",
                  active
                    ? "scale-110"
                    : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                )}
              />
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
