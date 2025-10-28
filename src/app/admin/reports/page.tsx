"use client";

import { useState } from "react";

type Rol = "admin" | "bf" | "jr";

export default function CreateUserPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    dni: "",
    nombre: "",
    apellidos: "",
    rol: "bf" as Rol,
    unidad_id: "",
    caseta_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // Muestra el mensaje devuelto por el servidor
        throw new Error(data?.error || "No se pudo crear el usuario.");
      }

      setMsg(`✅ Usuario creado. Auth ID: ${data.auth_user_id}`);
      setForm({
        email: "",
        password: "",
        dni: "",
        nombre: "",
        apellidos: "",
        rol: "bf",
        unidad_id: "",
        caseta_id: "",
      });
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 border rounded-xl shadow-md bg-white">
      <h1 className="text-xl font-bold mb-4">Crear nuevo usuario</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="border p-2 w-full rounded" type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required/>
        <input className="border p-2 w-full rounded" type="password" name="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required/>
        <input className="border p-2 w-full rounded" type="text" name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} required/>
        <input className="border p-2 w-full rounded" type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange}/>
        <input className="border p-2 w-full rounded" type="text" name="apellidos" placeholder="Apellidos" value={form.apellidos} onChange={handleChange}/>
        <select className="border p-2 w-full rounded" name="rol" value={form.rol} onChange={handleChange}>
          <option value="bf">Bombero forestal (bf)</option>
          <option value="jr">Jefe de retén (jr)</option>
          <option value="admin">Administrador (admin)</option>
        </select>
        <input className="border p-2 w-full rounded" type="text" name="unidad_id" placeholder="Unidad ID (UUID) — opcional" value={form.unidad_id} onChange={handleChange}/>
        <input className="border p-2 w-full rounded" type="text" name="caseta_id" placeholder="Caseta ID (UUID) — opcional" value={form.caseta_id} onChange={handleChange}/>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          {loading ? "Creando..." : "Crear usuario"}
        </button>
      </form>
      {msg && <p className="mt-4 text-center">{msg}</p>}
    </div>
  );
}
