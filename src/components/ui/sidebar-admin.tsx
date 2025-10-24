"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/forms", label: "Formularios" },
  { href: "/admin/reports", label: "Reportes" }
];

export function SidebarAdmin({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    
    <aside className={cn("hidden md:block w-64 shrink-0 bg-card border-r border-border sticky top-0 h-[calc(100vh-56px)]", className)}>
      <div className="p-4 font-bold tracking-tight text-xl">ADMINISTRACION</div>
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
