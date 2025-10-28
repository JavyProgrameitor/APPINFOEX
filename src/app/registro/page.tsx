// src/app/registro/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // se captura pero NO se envía a ningún lado
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const resp = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ⚠️ Por seguridad NO guardamos password aquí (tu requerimiento es que el admin cree Auth).
        body: JSON.stringify({ email }),
      });

      if (resp.status === 409) throw new Error("Ese email ya tiene una solicitud.");
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo registrar la solicitud.");
      }

      setOkMsg("¡Solicitud registrada! Un administrador te dará acceso en breve.");
      setEmail("");
      setPassword("");
    } catch (e: any) {
      setErr(e?.message ?? "Error inesperado durante el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-10">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h1 className="text-2xl font-semibold text-center">Crear cuenta INFOEX</h1>
          <p className="text-sm text-muted-foreground text-center">
            Tu solicitud se enviará al administrador. Cuando te asigne un rol, podrás entrar a la aplicación.
          </p>

          {okMsg && <p className="text-green-600 text-sm text-center">{okMsg}</p>}
          {err && <p className="text-red-600 text-sm text-center">{err}</p>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>

            {/* Mostramos password para que el usuario proponga una,
                pero NO la usamos todavía (opcionalmente puedes ocultarlo) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña (no usada todavía)</label>
              <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
