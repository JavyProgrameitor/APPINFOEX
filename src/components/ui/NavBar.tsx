// src/components/NavBar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

type Rol = "admin" | "jr" | "bf";

export default function NavBar() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;

      if (session?.user) {
        setEmail(session.user.email ?? null);
        // leer rol desde usuarios_app
        const { data: rec } = await supabase
          .from("usuarios_app")
          .select("rol")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
        if (rec?.rol) setRol(rec.rol as Rol);
      } else {
        setEmail(null);
        setRol(null);
      }
      setLoading(false);
    };

    init();

    // Suscribirse a cambios de sesión (login/logout) para refrescar navbar
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      init();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        <nav className="mt-3 rounded-2xl border bg-white-70 backdrop-blur-md shadow-sm
                        border-black-10 dark:border-white-10 dark:bg-black-30">
          <div className="h-14 flex items-center justify-between px-3">
            {/* Left: Logo + brand */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/img/Logo.jpg"
                alt="INFOEX"
                width={36}
                height={36}
                className="rounded-lg object-cover"
                priority
              />
              <span className="text-sm md:text-base font-semibold tracking-wide">INFOEX</span>
            </Link>

            {/* Right: Auth controls */}
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="text-xs opacity-70">cargando…</span>
              ) : email ? (
                <>
                  <span className="hidden sm:flex text-xs sm:text-sm items-center gap-2 px-2 py-1 rounded-xl border bg-white/60 dark:bg-white/10">
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded-full w-2 h-2 bg-green-500" />
                      <span className="font-medium">{roleLabel(rol)}</span>
                    </span>
                    <span className="opacity-70">·</span>
                    <span className="opacity-80">{email}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={onLogout}>
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <Link href="/" prefetch={false}>
                  <Button size="sm">Iniciar sesión</Button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
