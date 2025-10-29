"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminUsersPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    rol: "bf",
    dni: "",
    nombre: "",
    apellidos: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          rol: form.rol,
          dni: form.dni?.trim() || undefined,
          nombre: form.nombre?.trim() || undefined,
          apellidos: form.apellidos?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error desconocido");
      setMsg("Usuario creado correctamente.");
      setForm({
        email: "",
        password: "",
        rol: "bf",
        dni: "",
        nombre: "",
        apellidos: "",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h1 className="text-xl font-semibold">Crear usuario</h1>

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
              <label className="block text-sm mb-1">Rol</label>
              <select
                className="w-full border rounded-md h-10 px-2 bg-background"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                <option value="admin">admin</option>
                <option value="bf">bf</option>
                <option value="jr">jr</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">DNI</label>
                <Input
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Apellidos</label>
                <Input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear usuario"}
            </Button>
          </form>
          {msg && <p className="text-sm">{msg}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
