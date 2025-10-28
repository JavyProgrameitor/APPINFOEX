"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const links = [
  { href: "/jr/add", label: "Agregar" }
 
];

export function SidebarJR({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    
     <aside
      className={cn(
        // Misma línea visual que el Navbar: fondo más claro, borde blanco grueso
        "hidden md:block w-64 shrink-0 bg-[--card]/95 text-[--sidebar-foreground] " +
          "border-r-6 border-white/90 shadow-md backdrop-blur-md " +
          "sticky top-0 h-[calc(100vh-56px)]",
        className
      )}
    >
      <div className="p-4 font-bold tracking-tight text-xl">
        JEFES SERVICIO</div>
      <nav className="px-2 py-2 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-muted",
                active ? "bg-muted font-medium" : "text-foreground/80"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
