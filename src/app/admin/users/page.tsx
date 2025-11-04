"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Use-toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Rol = "admin" | "bf" | "jr";
type AsignacionTipo = "unidad" | "caseta";
type Opcion = { id: string; nombre: string };

export default function AdminUsersPage() {
  const { toast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rol: "bf" as Rol,
    dni: "",
    nombre: "",
    apellidos: "",
  });

  // NUEVO: asignación por unidad/caseta
  const [asignacionTipo, setAsignacionTipo] = useState<AsignacionTipo | "">("");
  const [unidadId, setUnidadId] = useState<string>("");
  const [casetaId, setCasetaId] = useState<string>("");

  // Opciones desde BBDD
  const [unidades, setUnidades] = useState<Opcion[]>([]);
  const [casetas, setCasetas] = useState<Opcion[]>([]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Cargar unidades/casetas
  useEffect(() => {
    const supa = getSupabaseBrowser();
    (async () => {
      const [{ data: u }, { data: c }] = await Promise.all([
        supa.from("unidades").select("id,nombre").order("nombre"),
        supa.from("casetas").select("id,nombre").order("nombre"),
      ]);
      setUnidades((u as Opcion[]) || []);
      setCasetas((c as Opcion[]) || []);
    })();
  }, []);

  // Validación de selección
  const seleccionValida = useMemo(() => {
    if (asignacionTipo === "unidad") return !!unidadId;
    if (asignacionTipo === "caseta") return !!casetaId;
    return false;
  }, [asignacionTipo, unidadId, casetaId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      if (!asignacionTipo) {
        throw new Error("Debes seleccionar “Asignar por” (Unidad o Caseta).");
      }
      if (!seleccionValida) {
        throw new Error(
          asignacionTipo === "unidad"
            ? "Debes seleccionar una Unidad."
            : "Debes seleccionar una Caseta."
        );
      }

      const supa = getSupabaseBrowser();
      const {
        data: { session },
      } = await supa.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          rol: form.rol,
          dni: form.dni?.trim() || undefined,
          nombre: form.nombre?.trim() || undefined,
          apellidos: form.apellidos?.trim() || undefined,
          unidad_id: asignacionTipo === "unidad" ? unidadId : undefined,
          caseta_id: asignacionTipo === "caseta" ? casetaId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error desconocido");

      toast({ title: "Usuario creado", description: "Se creó correctamente." });
      setAlert({ type: "success", msg: "Usuario creado correctamente." });

      // Reset
      setForm({ email: "", password: "", rol: "bf", dni: "", nombre: "", apellidos: "" });
      setAsignacionTipo("");
      setUnidadId("");
      setCasetaId("");
    } catch (err: any) {
      const message = err?.message ?? String(err);
      toast({ title: "Error al crear usuario", description: message });
      setAlert({ type: "error", msg: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-center">Crear usuario</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {alert && (
            <Alert variant={alert.type === "error" ? "destructive" : "default"}>
              <AlertTitle>{alert.type === "error" ? "Error" : "Listo"}</AlertTitle>
              <AlertDescription>{alert.msg}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <p className="text-xs mt-1">Mínimo 6 caracteres.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Usuario tipo</label>
              <select
                className="w-full border rounded-md h-10 px-2 bg-background"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
              >
                <option value="admin">admin</option>
                <option value="bf">bf</option>
                <option value="jr">jr</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">DNI</label>
                <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Apellidos</label>
                <Input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                />
              </div>
            </div>

            {/* Asignación por Unidad o Caseta */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Asignar por</label>
                <select
                  className="w-full border rounded-md h-10 px-2 bg-background"
                  value={asignacionTipo}
                  onChange={(e) => {
                    const v = e.target.value as AsignacionTipo | "";
                    setAsignacionTipo(v);
                    setUnidadId("");
                    setCasetaId("");
                  }}
                >
                  <option value="">— Selecciona —</option>
                  <option value="unidad">Unidad</option>
                  <option value="caseta">Caseta</option>
                </select>
              </div>

              {asignacionTipo === "unidad" && (
                <div>
                  <label className="block text-sm mb-1">Unidad</label>
                  <select
                    className="w-full border rounded-md h-10 px-2 bg-background"
                    value={unidadId}
                    onChange={(e) => setUnidadId(e.target.value)}
                  >
                    <option value="">— Selecciona unidad —</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {asignacionTipo === "caseta" && (
                <div>
                  <label className="block text-sm mb-1">Caseta</label>
                  <select
                    className="w-full border rounded-md h-10 px-2 bg-background"
                    value={casetaId}
                    onChange={(e) => setCasetaId(e.target.value)}
                  >
                    <option value="">— Selecciona caseta —</option>
                    {casetas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!seleccionValida && asignacionTipo && (
              <p className="text-xs text-red-600">
                {asignacionTipo === "unidad"
                  ? "Debes seleccionar una Unidad."
                  : "Debes seleccionar una Caseta."}
              </p>
            )}

            <Button type="submit" disabled={loading || !seleccionValida}>
              {loading ? "Creando..." : "Crear usuario"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
