// src/components/NavBar.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

  // tema
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLight = mounted ? theme === "light" : null;

  const justLoggedOutRef = useRef(false);

  const fetchMe = useCallback(
    async (opts?: { redirectOn401?: boolean }) => {
      // si acabamos de pulsar "Salir", nos saltamos una vuelta
      if (justLoggedOutRef.current) {
        justLoggedOutRef.current = false;
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });

        if (res.status === 200) {
          const json = await res.json();
          setEmail(json.email);
          setRol(json.rol);
        } else if (res.status === 401) {
          // no hay sesión
          setEmail(null);
          setRol(null);
          if (opts?.redirectOn401) {
            // solo redirigimos si NO estamos ya en /
            if (pathname !== "/") {
              router.replace("/");
            }
          }
        } else {
          // otro error
          setEmail(null);
          setRol(null);
        }
      } catch {
        setEmail(null);
        setRol(null);
      } finally {
        setLoading(false);
      }
    },
    [router, pathname]
  );

  // 1) al montar
  useEffect(() => {
    fetchMe({ redirectOn401: true });
  }, [fetchMe]);

  // 2) cada vez que cambie la ruta → vuelvo a mirar la sesión
  useEffect(() => {
    fetchMe({ redirectOn401: isRoleRoute });
  }, [fetchMe, isRoleRoute]);

  // 3) cuando la pestaña vuelva a estar visible
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchMe({ redirectOn401: isRoleRoute });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchMe, isRoleRoute]);

  const onLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    // marcamos que acabamos de salir para no reconsultar justo después
    justLoggedOutRef.current = true;
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
   
      <header className="mx-auto max-w-6xl px-2">
        <nav className="mt-1 rounded-2xl border-8 border-white-90 shadow-md backdrop-blur-md bg-[--card]/92 supports-[backdrop-filter]:bg-[--card]/85">
          <div className="relative h-20 flex items-center justify-between">
            {/* Izquierda */}
            <Link href="/" className="flex items-center">
              <Image
                src="/img/logoGreen.svg"
                alt="INFOEX"
                width={80}
                height={56}
                className="rounded-lg object-cover"
                priority
              />
            </Link>

            {/* Título */}
            <span
              className={`${
                isRoleRoute
                  ? "absolute left-16 md:left-20 text-left"
                  : "absolute left-1/2 -translate-x-1/2 text-center"
              } text-sm md:text-base font-black transition-all duration-300`}
            >
              APP CONTROL-DIARIO
            </span>

            {/* Derecha */}
            <div className="flex items-center gap-2 mr-2" >
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
      </header>
  );
}
