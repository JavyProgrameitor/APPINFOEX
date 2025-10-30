// src/app/jr/add/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type BomberoLite = {
  dni: string;
  nombre: string;
  apellidos: string;
  is_jefe_reten?: boolean;
};

function AddJR() {
  const router = useRouter();
  const params = useSearchParams();

  // --- llegan en la URL desde la página anterior ---
  const tipo = params.get("tipo"); // "unidad" | "caseta"
  const provinciaNombre = params.get("provincia") || ""; // puede que ya no lo uses
  const zonaNombre = params.get("zona") || "";
  const municipioNombre = params.get("municipio") || "";
  const unidadNombre = params.get("unidad") || "";
  const casetaNombre = params.get("caseta") || "";

  // Ya no vamos a resolver IDs en la BBDD
  const [unidadId] = useState<string | null>(null);
  const [casetaId] = useState<string | null>(null);

  // --- ROSTER (lista del día) con persistencia en localStorage ---
  const storageKey = useMemo(() => {
    const part =
      tipo === "unidad"
        ? (unidadId || `U:${zonaNombre}/${unidadNombre}`)
        : (casetaId || `C:${zonaNombre}/${municipioNombre}/${casetaNombre}`);
    return `INFOEX:roster:${tipo}:${part}`;
  }, [
    tipo,
    zonaNombre,
    municipioNombre,
    unidadNombre,
    casetaNombre,
    unidadId,
    casetaId,
  ]);

  const [roster, setRoster] = useState<BomberoLite[]>([]);

  // cargar roster guardado
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BomberoLite[];
        if (Array.isArray(parsed)) setRoster(parsed);
        else setRoster([]);
      } else {
        setRoster([]);
      }
    } catch {
      setRoster([]);
    }
  }, [storageKey]);

  // persistir roster
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(roster));
    } catch {
      // ignore
    }
  }, [roster, storageKey]);

  // --- Formulario para añadir bomberos al roster del día ---
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [isJR, setIsJR] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addBombero(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const clean: BomberoLite = {
      dni: dni.trim().toUpperCase(),
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      is_jefe_reten: isJR,
    };
    if (!clean.dni || !clean.nombre || !clean.apellidos) {
      setMsg("Completa DNI, nombre y apellidos.");
      return;
    }
    if (roster.some((b) => b.dni === clean.dni)) {
      setMsg("Ya hay un bombero con ese DNI en la lista.");
      return;
    }
    setRoster((prev) => [...prev, clean]);
    setDni("");
    setNombre("");
    setApellidos("");
    setIsJR(false);
  }

  function removeBombero(dni: string) {
    setRoster((prev) => prev.filter((b) => b.dni !== dni));
  }

  // si alguien llega sin params mínimos, lo mandamos atrás
  useEffect(() => {
    if (!tipo || !zonaNombre) {
      router.replace("/jr");
    }
  }, [tipo, zonaNombre, router]);

  const tituloDestino =
    tipo === "unidad"
      ? `Unidad: ${unidadNombre} (Zona: ${zonaNombre})`
      : `Caseta: ${casetaNombre} — Municipio: ${municipioNombre} (Zona: ${zonaNombre}${
          provinciaNombre ? `, Prov.: ${provinciaNombre}` : ""
        })`;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Lista de Bomberos del día</h1>
        </div>
        <Card className="shadow-xl ">
          <CardHeader>
            <CardTitle>{tituloDestino}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Controles superiores */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm("¿Vaciar la lista guardada de este destino?")) {
                    setRoster([]);
                  }
                }}
              >
                Vaciar lista
              </Button>
              {msg && <span className="text-sm text-red-600">{msg}</span>}
            </div>

            {/* Formulario de alta local */}
            <form onSubmit={addBombero} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium">DNI</label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12345678A"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Apellidos</label>
                <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
              </div>

              <div className="flex items-center gap-2 md:col-span-3">
                <input
                  id="jr"
                  type="checkbox"
                  checked={isJR}
                  onChange={(e) => setIsJR(e.target.checked)}
                />
                <label htmlFor="jr" className="text-sm">Jefe de Retén (JR)</label>
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button type="submit" className="w-full">Añadir a la lista</Button>
              </div>
            </form>

            {/* Lista persistente */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {roster.length === 0
                  ? "No hay bomberos en la lista guardada para este destino."
                  : `Bomberos en la lista (${roster.length})`}
              </div>

              <div className="rounded-xl border bg-background">
                <div className="grid grid-cols-12 px-3 py-2 text-xs font-medium">
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-5">Apellidos</div>
                  <div className="col-span-1 text-center">JR</div>
                  <div className="col-span-1 text-right">Acción</div>
                </div>
                <div className="divide-y">
                  {roster.map((b) => (
                    <div key={b.dni} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                      <div className="col-span-3">{b.nombre}</div>
                      <div className="col-span-5">{b.apellidos}</div>
                      <div className="col-span-1 text-center">{b.is_jefe_reten ? "Sí" : "No"}</div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeBombero(b.dni)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Acciones inferiores */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => router.push("/jr")}>
                Atrás
              </Button>
              <Button onClick={() => alert("Guardado en este navegador 👍")}>
                Aceptar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <AddJR />
    </Suspense>
  );
}
