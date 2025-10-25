// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import "./globals.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/ui/footer";

type Rol = "admin" | "jr" | "bf";

const ROLE_ROUTES: Record<Rol, string> = {
  admin: "/admin",
  jr: "/jr",
  bf: "/bf",
};

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, resolvemos rol y redirigimos
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      supabase.auth.signOut();
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const ok = await resolveAndRouteByRole(session.user.id);
      if (!ok) {
        // Si el user no tiene rol válido, forzamos logout
        await supabase.auth.signOut();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveAndRouteByRole(authUserId: string): Promise<boolean> {
    const { data: rec, error: roleErr } = await supabase
      .from("users")
      .select("rol")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (roleErr) {
      setError(`No se pudo verificar tu rol: ${roleErr.message}`);
      return false;
    }
    if (!rec?.rol) {
      setError("Tu usuario no tiene rol asignado en INFOEX. Contacta con administración.");
      return false;
    }

    const rol = rec.rol as Rol;
    const dest = ROLE_ROUTES[rol];
    if (!dest) {
      setError("Rol desconocido. Contacta con administración.");
      return false;
    }

    router.replace(dest);
    return true;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        // Registro (si lo permites). Puedes deshabilitar esta rama si sólo crea admins el alta.
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;

        if (data.session?.user?.id) {
          const ok = await resolveAndRouteByRole(data.session.user.id);
          if (!ok) await supabase.auth.signOut();
        } else {
          // No hay sesión inmediata (email de verificación). Informamos al usuario.
          setError("Revisa tu correo para verificar la cuenta. Una vez verificada, inicia sesión.");
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;

        if (!data.user?.id) {
          setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
          return;
        }

        const ok = await resolveAndRouteByRole(data.user.id);
        if (!ok) {
          await supabase.auth.signOut();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xl font-black">Email</label>
                <Input
                  type="email"
                  placeholder="tucorreo@infoex.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xl font-black">Contraseña</label>
                <Input
                  type="password"
                  placeholder="........"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-foreground">{error}</p>
              )}
              <Button type="submit" className="w-full" >
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <div>
        <Footer />
      </div>
    </>
  );
}
