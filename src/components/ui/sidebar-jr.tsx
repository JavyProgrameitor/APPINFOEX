"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Salir" },
  { href: "/jr/add", label: "Agregar" }
 
];

export function SidebarJR({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    
    <aside className={cn("w-64 shrink-0 border-r bg-gradient-to-b from-green-200 via-yellow-300 to-yellow-200", className)}>
      <div className="p-4 font-bold tracking-tight text-xl">JEFES SERVICIO</div>
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
