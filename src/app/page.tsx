
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import "./globals.css";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Footer from "@/components/Footer";

type Rol = "admin" | "jr" | "bf";

const ROLE_ROUTES: Record<Rol, string> = {
  admin: "/admin",
  jr: "/jr",
  bf: "/bf",
};

export default function AuthPage() {
  const router = useRouter();

  // cliente SOLO en browser
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // al montar: si ya hay sesión en el cliente, resolvemos rol y redirigimos
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const ok = await resolveAndRouteByRole(session.user.id);
      if (!ok) {
        await supabase.auth.signOut();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveAndRouteByRole(authUserId: string): Promise<boolean> {
    // leemos la tabla users desde el cliente
    const { data: rec, error: roleErr } = await supabase
      .from("usuarios")
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
        <Card className="w-full max-w-sm shadow-2xl">
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

              {error && <p className="text-sm text-foreground">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
