// src/app/admin/usuarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Rol = "pending" | "admin" | "jr" | "bf";
type UserRow = {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  rol: Rol;
  creado_en?: string;
  auth_user_id?: string | null; // para saber si ya tiene cuenta Auth
};

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Cargar usuarios
  async function loadUsers() {
    setLoading(true);
    setError(null);
    setInfoMsg(null);

    const { data, error } = await supabaseBrowser
      .from("users")
      .select("id,email,nombre,apellidos,rol,creado_en,auth_user_id")
      .order("creado_en", { ascending: false });

    if (error) setError(error.message);
    setUsuarios((data ?? []) as UserRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Cambiar rol
  async function setRol(id: string, nuevoRol: Rol) {
    setSaving(id);
    setError(null);
    const { error } = await supabaseBrowser
      .from("users")
      .update({ rol: nuevoRol })
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      await loadUsers();
    }
    setSaving(null);
  }

  // Invitar por email (envía email de Supabase para crear contraseña)
  async function invitar(email: string | null, id: string) {
    if (!email) {
      setError("El usuario no tiene email.");
      return;
    }
    setInvitingId(id);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await fetch("/api/admin/invitar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "No se pudo enviar la invitación.");
      } else {
        setInfoMsg(`Invitación enviada a ${email}.`);
        // Opcional: ya marcamos rol=bf al invitar (si así lo hace tu API),
        // recargamos para reflejar cambios.
        await loadUsers();
      }
    } catch (e) {
      setError("Error de red al invitar usuario.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Gestión de Usuarios INFOEX
      </h1>

      {error && (
        <p className="bg-red-100 text-red-800 p-2 rounded mb-4">{error}</p>
      )}
      {infoMsg && (
        <p className="bg-green-100 text-green-800 p-2 rounded mb-4">{infoMsg}</p>
      )}

      <Card className="shadow-md">
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <p className="text-center">Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-center">No hay usuarios registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-300 rounded-md">
                <thead className="bg-gray-100">
                  <tr className="text-left">
                    <th className="p-2 border-b">Email</th>
                    <th className="p-2 border-b">Nombre</th>
                    <th className="p-2 border-b">Apellidos</th>
                    <th className="p-2 border-b text-center">Rol</th>
                    <th className="p-2 border-b text-center">Auth</th>
                    <th className="p-2 border-b text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-2">{u.email ?? ""}</td>
                      <td className="p-2">{u.nombre ?? ""}</td>
                      <td className="p-2">{u.apellidos ?? ""}</td>
                      <td className="p-2 text-center">
                        <select
                          className="border rounded px-2 py-1 bg-white"
                          value={u.rol}
                          onChange={(e) => setRol(u.id, e.target.value as Rol)}
                          disabled={saving === u.id}
                        >
                          <option value="pending">pending</option>
                          <option value="admin">admin</option>
                          <option value="jr">jr</option>
                          <option value="bf">bf</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        {u.auth_user_id ? "✅" : "—"}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => invitar(u.email, u.id)}
                            disabled={invitingId === u.id || !u.email}
                            title="Envía email para que el usuario establezca su contraseña"
                          >
                            {invitingId === u.id ? "Enviando..." : "Invitar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
