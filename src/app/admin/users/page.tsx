// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Rol = "admin" | "jr" | "bf";
type Solicitud = {
  id: string;               // id de public.users
  email: string | null;
  created_at: string;
  pending?: boolean | null; // true si auth_user_id es NULL
};

export default function UsuariosAdmin() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Record<string, Rol>>({});
  const [verTodos, setVerTodos] = useState(false); // <- NUEVO

  async function cargarSolicitudes() {
    setLoading(true);
    setError(null);
    setInfoMsg(null);
    try {
      const url = verTodos ? "/api/admin?all=1" : "/api/admin";
      const res = await fetch(url, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudieron cargar las solicitudes.");

      const lista: Solicitud[] = json.solicitudes ?? [];
      setSolicitudes(lista);

      const preset: Record<string, Rol> = {};
      for (const s of lista) preset[s.id] = (rolesSeleccionados[s.id] ?? "jr") as Rol;
      setRolesSeleccionados(preset);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado al cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verTodos]); // recargar si cambiamos el modo

  const setRolLocal = (id: string, rol: Rol) => {
    setRolesSeleccionados((prev) => ({ ...prev, [id]: rol }));
  };

  async function aprobar(id: string) {
    const rol = rolesSeleccionados[id] || "jr";
    setSavingId(id);
    setError(null);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, rol }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo aprobar la solicitud.");

      if (json?.temp_password && json?.email) {
        setInfoMsg(`Usuario ${json.email} aprobado con rol "${rol}". Contraseña temporal: ${json.temp_password}`);
      } else {
        setInfoMsg(`Usuario aprobado con rol "${rol}".`);
      }

      await cargarSolicitudes();
    } catch (e: any) {
      setError(e?.message ?? "Error aprobando el usuario.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Solicitudes de registro</h1>

      <div className="mb-4 flex items-center justify-center gap-3">
        <label className="text-sm">
          <input
            type="checkbox"
            className="align-middle mr-2"
            checked={verTodos}
            onChange={(e) => setVerTodos(e.target.checked)}
          />
          Ver todos (incluye aprobados)
        </label>
      </div>

      {error && <p className="bg-red-100 text-red-800 p-2 rounded mb-4">{error}</p>}
      {infoMsg && <p className="bg-green-100 text-green-800 p-2 rounded mb-4">{infoMsg}</p>}

      <Card className="shadow-md">
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <p className="text-center">Cargando…</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-center">No hay solicitudes {verTodos ? "registradas" : "pendientes"}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-300 rounded-xl">
                <thead className="bg-gray-400">
                  <tr className="text-left">
                    <th className="p-2 border-b">Email</th>
                    <th className="p-2 border-b text-center">Estado</th>
                    <th className="p-2 border-b text-center">Rol a asignar</th>
                    <th className="p-2 border-b text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => {
                    const estado = s.pending ? "pendiente" : "aprobado";
                    const isPending = !!s.pending;

                    return (
                      <tr key={s.id} className="border-b hover:bg-gray-500 transition-colors">
                        <td className="p-2">{s.email ?? ""}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${isPending ? "bg-yellow-200 text-yellow-800" : "bg-green-200 text-green-800"}`}>
                            {estado}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <select
                            className="border rounded px-2 py-1 bg-gray-400"
                            value={rolesSeleccionados[s.id] ?? "jr"}
                            onChange={(e) => setRolLocal(s.id, e.target.value as Rol)}
                            disabled={savingId === s.id || !isPending} // solo se asigna rol a pendientes
                          >
                            <option value="jr">jr</option>
                            <option value="bf">bf</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            onClick={() => aprobar(s.id)}
                            disabled={savingId === s.id || !isPending} // solo aprobar pendientes
                          >
                            {savingId === s.id ? "Guardando…" : "Aprobar"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
