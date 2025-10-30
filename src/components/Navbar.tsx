// src/components/NavBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type Rol = "admin" | "jr" | "bf" | null;

export default function NavBar() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isRoleRoute = useMemo(
    () =>
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/bf") ||
      pathname?.startsWith("/jr"),
    [pathname]
  );

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLight = mounted ? theme === "light" : null;

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json();
        console.log("[NavBar] /api/me ->", json);

        if (!alive) return;

        if (res.ok) {
          setEmail(json.email);
          setRol(json.rol);
        } else {
          setEmail(null);
          setRol(null);
        }
      } catch {
        if (!alive) return;
        setEmail(null);
        setRol(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const onLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      console.log("[NavBar] /api/logout ->", await res.json());
    } catch {
      // ignore
    }
    setEmail(null);
    setRol(null);
    router.replace("/");
  };

  const roleLabel = (r: Rol) => {
    if (!r) return "";
    if (r === "admin") return "Administrador";
    if (r === "jr") return "Jefe de Retén";
    return "Bombero Forestal";
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto max-w-6xl px-4">
        <nav className="mt-3 rounded-2xl border-4 border-white/90 shadow-md backdrop-blur-md bg-[--card]/92 supports-[backdrop-filter]:bg-[--card]/85">
          <div className="relative h-14 flex items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/img/Logo.jpg"
                alt="INFOEX"
                width={36}
                height={36}
                className="rounded-lg object-cover"
                priority
              />
            </Link>
            <span
              className={`${
                isRoleRoute
                  ? "absolute left-16 md:left-20 text-left"
                  : "absolute left-1/2 -translate-x-1/2 text-center"
              } text-sm md:text-base font-black transition-all duration-300`}
            >
              APP CONTROL-DIARIO
            </span>
            <div className="flex items-center gap-2">
              {isRoleRoute && !loading && email && (
                <>
                  <span className="hidden sm:flex text-xs sm:text-sm items-center gap-2 px-3 py-1 rounded-xl border border-white/40 bg-white/10">
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded-full w-2 h-2 bg-card" />
                      <span className="font-medium">{roleLabel(rol)}</span>
                    </span>
                    <span className="text-primary opacity-70">✓</span>
                    <span className="opacity-80">{email}</span>
                  </span>
                  <Button size="sm" variant="destructive" onClick={onLogout}>
                    Salir
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => mounted && setTheme(isLight ? "dark" : "light")}
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
        </nav>
      </div>
    </header>
  );
}
