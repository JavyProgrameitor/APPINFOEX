// src/app/jr/add/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Evita que Next intente prerender estáticamente esta ruta durante el build
export const dynamic = "force-dynamic";

type BomberoLite = {
  dni: string;
  nombre: string;
  apellidos: string;
  is_jefe_reten?: boolean;
};

type Provincia = { id: string; nombre: string };
type Zona = { id: string; nombre: string; provincia_id: string };
type Municipio = { id: string; nombre: string; zona_id: string };
type Unidad = { id: string; nombre: string; zona_id: string };
type Caseta = { id: string; nombre: string; municipio_id: string };

function AddRosterPageClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [authed, setAuthed] = useState<boolean | null>(null);

  // ---
  const tipo = params.get("tipo"); // "unidad" | "caseta"
  const provinciaNombre = params.get("provincia") || "";
  const zonaNombre = params.get("zona") || "";
  const municipioNombre = params.get("municipio") || "";
  const unidadNombre = params.get("unidad") || "";
  const casetaNombre = params.get("caseta") || "";

  // --- IDs reales para poder consultar BD por unidad/caseta ---
  const [, setProvinciaId] = useState<string | null>(null);
  const [, setZonaId] = useState<string | null>(null);
  const [, setMunicipioId] = useState<string | null>(null);
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [casetaId, setCasetaId] = useState<string | null>(null);

  // --- ROSTER (lista del día) con persistencia en localStorage ---
  const storageKey = useMemo(() => {
    const part =
      tipo === "unidad"
        ? (unidadId || `U:${provinciaNombre}/${zonaNombre}/${unidadNombre}`)
        : (casetaId || `C:${provinciaNombre}/${zonaNombre}/${municipioNombre}/${casetaNombre}`);
    return `INFOEX:roster:${tipo}:${part}`;
  }, [
    tipo,
    provinciaNombre,
    zonaNombre,
    municipioNombre,
    unidadNombre,
    casetaNombre,
    unidadId,
    casetaId,
  ]);

  const [roster, setRoster] = useState<BomberoLite[]>([]);

  // --- Comprobación de sesión y resolución de IDs (por nombres) ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      setAuthed(true);

      // Resolver provincia -> zona -> (unidad|caseta)
      const { data: pData } = await supabase.from("provincias").select("id,nombre");
      const p = (pData || []).find((x: Provincia) => x.nombre === provinciaNombre) as
        | Provincia
        | undefined;
      if (!p) return;
      setProvinciaId(p.id);

      const { data: zData } = await supabase
        .from("zonas")
        .select("id,nombre,provincia_id")
        .eq("provincia_id", p.id);
      const z = (zData || []).find((x: Zona) => x.nombre === zonaNombre) as
        | Zona
        | undefined;
      if (!z) return;
      setZonaId(z.id);

      if (tipo === "unidad") {
        const { data: uData } = await supabase
          .from("unidades")
          .select("id,nombre,zona_id")
          .eq("zona_id", z.id);
        const u = (uData || []).find((x: Unidad) => x.nombre === unidadNombre) as
          | Unidad
          | undefined;
        if (u) setUnidadId(u.id);
      } else if (tipo === "caseta") {
        const { data: mData } = await supabase
          .from("municipios")
          .select("id,nombre,zona_id")
          .eq("zona_id", z.id);
        const m = (mData || []).find(
          (x: Municipio) => x.nombre === municipioNombre
        ) as Municipio | undefined;
        if (!m) return;
        setMunicipioId(m.id);

        const { data: cData } = await supabase
          .from("casetas")
          .select("id,nombre,municipio_id")
          .eq("municipio_id", m.id);
        const c = (cData || []).find(
          (x: Caseta) => x.nombre === casetaNombre
        ) as Caseta | undefined;
        if (c) setCasetaId(c.id);
      }
    })();
  }, [router, provinciaNombre, zonaNombre, municipioNombre, unidadNombre, casetaNombre, tipo]);

  // --- Cargar roster guardado (cuando tengamos la storageKey lista) ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BomberoLite[];
        if (Array.isArray(parsed)) setRoster(parsed);
      } else {
        setRoster([]); // nuevo destino -> lista vacía
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // --- Persistir automáticamente cada cambio ---
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

  // --- Utilidad: importar desde BD los bomberos de la unidad/caseta (mezcla sin duplicar DNIs) ---
  async function importarDesdeBD() {
    if (tipo === "unidad" && unidadId) {
      const { data } = await supabase
        .from("bomberos")
        .select("dni,nombre,apellidos,is_jefe_reten")
        .eq("unidad_id", unidadId);
      if (data) {
        mezclaBomberos(data as BomberoLite[]);
      }
    } else if (tipo === "caseta" && casetaId) {
      const { data } = await supabase
        .from("bomberos")
        .select("dni,nombre,apellidos,is_jefe_reten")
        .eq("caseta_id", casetaId);
      if (data) {
        mezclaBomberos(data as BomberoLite[]);
      }
    } else {
      setMsg("No se pudo resolver el destino en BD para importar.");
    }
  }

  function mezclaBomberos(nuevos: BomberoLite[]) {
    setRoster((prev) => {
      const mapa = new Map(prev.map((b) => [b.dni, b]));
      for (const b of nuevos) if (!mapa.has(b.dni)) mapa.set(b.dni, b);
      return [...mapa.values()];
    });
  }

  // --- Interfaz ---
  if (authed === null) return null;

  const tituloDestino =
    tipo === "unidad"
      ? `Unidad: ${unidadNombre} (Zona: ${zonaNombre}, Prov.: ${provinciaNombre})`
      : `Caseta: ${casetaNombre} — Municipio: ${municipioNombre} (Zona: ${zonaNombre}, Prov.: ${provinciaNombre})`;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Lista de Bomberos del día</h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/");
              }}
            >
              Cerrar sesión
            </Button>
            <Button variant="secondary" onClick={() => router.push("/jr")}>
              Cambiar destino
            </Button>
          </div>
        </div>

        <Card className="shadow-xl ">
          <CardHeader>
            <CardTitle>{tituloDestino}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Controles superiores */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={importarDesdeBD}>
                Importar desde BD (mezclar)
              </Button>
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

            {/* Lista persistente (localStorage) */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {roster.length === 0
                  ? "No hay bomberos en la lista guardada para este destino."
                  : `Bomberos en la lista (${roster.length})`}
              </div>

              <div className="rounded-xl border bg-background">
                <div className="grid grid-cols-12 px-3 py-2 text-xs font-medium">
                  <div className="col-span-2">DNI</div>
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-5">Apellidos</div>
                  <div className="col-span-1 text-center">JR</div>
                  <div className="col-span-1 text-right">Acción</div>
                </div>
                <div className="divide-y">
                  {roster.map((b) => (
                    <div key={b.dni} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                      <div className="col-span-2 font-mono">{b.dni}</div>
                      <div className="col-span-3">{b.nombre}</div>
                      <div className="col-span-5">{b.apellidos}</div>
                      <div className="col-span-1 text-center">{b.is_jefe_reten ? "Sí" : "No"}</div>
                      <div className="col-span-1 text-right">
                        <Button variant="secondary" size="sm" onClick={() => removeBombero(b.dni)}>
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
              <Button onClick={() => alert("Guardado localStore . Próximo paso: control_diario")}>
                Aceptar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// El componente de página que Next renderiza: aquí envolvemos en Suspense
export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <AddRosterPageClient />
    </Suspense>
  );
}
