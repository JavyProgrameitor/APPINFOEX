// src/components/NavBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "../../public/img/Logo.jpg";

type Rol = "admin" | "jr" | "bf";

export default function NavBar() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 👉 instancia del cliente solo una vez
  const supabase = useMemo(() => supabaseBrowser(), []);

  // 🧭 Saber si estamos en una ruta de rol
  const isRoleRoute = useMemo(
    () =>
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/bf") ||
      pathname?.startsWith("/jr"),
    [pathname]
  );

  // 🌙 Tema
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLight = mounted ? theme === "light" : false;

  // 🔐 Sesión Supabase
  useEffect(() => {
    let mountedFlag = true;

    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mountedFlag) return;

      if (session?.user) {
        setEmail(session.user.email ?? null);

        const { data: rec, error } = await supabase
          .from("users")
          .select("rol")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (!mountedFlag) return;
        if (!error && rec?.rol) setRol(rec.rol as Rol);
        else setRol(null);
      } else {
        setEmail(null);
        setRol(null);
      }
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      mountedFlag = false;
      sub?.subscription?.unsubscribe?.();
      // compatibilidad con distintas versiones:
      // @ts-expect-error
      sub?.unsubscribe?.();
    };
  }, [supabase]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setRol(null);
    router.replace("/");
  };

  const roleLabel = (r: Rol | null) => {
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
            {/* Izquierda: Logo */}
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch {}
                router.replace("/"); // o router.push("/")
              }}
              className="flex items-center gap-3"
              aria-label="Ir al inicio y salir"
            >
              <Image
                src={logo}
                alt="INFOEX"
                className="h-9 w-auto rounded-lg object-cover"
                priority
              />
            </button>

            <span
              className={`${
                isRoleRoute
                  ? "absolute left-16 md:left-20 text-left"
                  : "absolute left-1/2 -translate-x-1/2 text-center"
              } text-sm md:text-base font-black transition-all duration-300`}
            >
              APP CONTROL-DIARIO
            </span>

            {/* Derecha: controles */}
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
