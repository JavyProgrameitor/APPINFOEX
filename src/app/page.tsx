// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      .from("usuarios_app")
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

        // Dependiendo de la política de Supabase, puede requerir verificación por email.
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
    } catch (err: any) {
      setError(err?.message || "Error de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-100 via-yellow-300 to-green-200">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">
            {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="tucorreo@infoex.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Procesando..."
                : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
            </Button>

            <button
              type="button"
              onClick={() =>
                setMode((m) => (m === "signin" ? "signup" : "signin"))
              }
              className="w-full text-xs text-muted-foreground mt-1 underline"
            >
              {mode === "signin"
                ? "¿No tienes cuenta? Crear una"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </form>

          {/* Opcional: enlace recuperar contraseña si lo habilitas en Supabase */}
          {/* <div className="mt-3 text-center">
            <button
              className="text-xs underline text-muted-foreground"
              onClick={() => router.push("/recover")}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div> */}
        </CardContent>
      </Card>
    </main>
  );
}
