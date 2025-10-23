"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tipo = "unidad" | "caseta";

type Provincia = { id: string; nombre: string };
type Zona = { id: string; nombre: string; provincia_id: string };
type Municipio = { id: string; nombre: string; zona_id: string };
type Unidad = { id: string; nombre: string; zona_id: string };
type Caseta = { id: string; nombre: string; municipio_id: string };

type Selection = {
  provinciaId?: string;
  zonaId?: string;
  municipioId?: string;
  tipo?: Tipo;
  unidadNombre?: string;
  casetaNombre?: string;
};

export default function StartPage() {
  const router = useRouter();
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      setAuthed(true);
    })();
  }, [router]);


  const [sel, setSel] = useState<Selection>({});

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [casetas, setCasetas] = useState<Caseta[]>([]);

  // Cargar provincias al montar
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("provincias")
        .select("id,nombre")
        .order("nombre", { ascending: true });
      if (!error && data) setProvincias(data as Provincia[]);
    })();
  }, []);

  // Cuando cambia provincia, cargar zonas
  useEffect(() => {
    if (!sel.provinciaId) {
      setZonas([]); setMunicipios([]); setUnidades([]); setCasetas([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("zonas")
        .select("id,nombre,provincia_id")
        .eq("provincia_id", sel.provinciaId)
        .order("nombre", { ascending: true });
      if (!error && data) setZonas(data as Zona[]);
    })();
  }, [sel.provinciaId]);

  // Cuando cambia zona, cargar municipios y unidades
  useEffect(() => {
    if (!sel.zonaId) {
      setMunicipios([]); setUnidades([]); setCasetas([]);
      return;
    }
    (async () => {
      const [{ data: mData }, { data: uData }] = await Promise.all([
        supabase
          .from("municipios")
          .select("id,nombre,zona_id")
          .eq("zona_id", sel.zonaId)
          .order("nombre", { ascending: true }),
        supabase
          .from("unidades")
          .select("id,nombre,zona_id")
          .eq("zona_id", sel.zonaId)
          .order("nombre", { ascending: true }),
      ]);
      if (mData) setMunicipios(mData as Municipio[]);
      if (uData) setUnidades(uData as Unidad[]);
    })();
  }, [sel.zonaId]);

  // Cuando cambia municipio, cargar casetas
  useEffect(() => {
    if (!sel.municipioId) {
      setCasetas([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("casetas")
        .select("id,nombre,municipio_id")
        .eq("municipio_id", sel.municipioId)
        .order("nombre", { ascending: true });
      if (data) setCasetas(data as Caseta[]);
    })();
  }, [sel.municipioId]);

  //  municipio seleccionado pero sin casetas
  const noCasetas = sel.tipo === "caseta" && !!sel.municipioId && casetas.length === 0;

  const ready =
    !!sel.provinciaId &&
    !!sel.zonaId &&
    !!sel.tipo &&
    ((sel.tipo === "unidad" && !!sel.unidadNombre) ||
      (sel.tipo === "caseta" && !!sel.municipioId && !!sel.casetaNombre));

  function goNext() {
  
    const provinciaNombre = provincias.find(p => p.id === sel.provinciaId)?.nombre;
    const zonaNombre = zonas.find(z => z.id === sel.zonaId)?.nombre;
    const municipioNombre = municipios.find(m => m.id === sel.municipioId)?.nombre;

    const params = new URLSearchParams();
    if (provinciaNombre) params.set("provincia", provinciaNombre);
    if (zonaNombre) params.set("zona", zonaNombre);
    if (municipioNombre) params.set("municipio", municipioNombre || "");
    if (sel.tipo) params.set("tipo", sel.tipo);
    if (sel.unidadNombre) params.set("unidad", sel.unidadNombre || "");
    if (sel.casetaNombre) params.set("caseta", sel.casetaNombre || "");
    router.push(`/add?${params.toString()}`);
  }

  if (authed === null) return null;

  return (
    <main className="min-h-screen  bg-gradient-to-b from-yellow-100 via-yellow-300 to-green-200 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <Card className="shadow-xl bg-yellow-100 border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl md:text-3xl tracking-tight">
              Selecciona tu destino
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Provincia y Zona */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provincia</label>
                <select
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring-40 disabled:cursor-not-allowed disabled:opacity-50"
                  value={sel.provinciaId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setSel({ provinciaId: value });
                  }}
                >
                  <option value="" disabled>Selecciona provincia…</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Zona</label>
                <select
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring-40 disabled:cursor-not-allowed disabled:opacity-50"
                  value={sel.zonaId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setSel((prev) => ({ ...prev, zonaId: value, tipo: undefined, municipioId: undefined, unidadNombre: undefined, casetaNombre: undefined }));
                  }}
                  disabled={!sel.provinciaId}
                >
                  <option value="" disabled>
                    {sel.provinciaId ? "Selecciona zona…" : "Selecciona provincia primero"}
                  </option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de puesto</label>
              <div className="grid grid-cols-2 gap-2 md:max-w-sm">
                <button
                  type="button"
                  className={`h-10 rounded-xl border px-3 text-sm transition-colors ${sel.tipo === "unidad" ? "border-ring ring-2 ring-ring-40" : "hover:bg-muted"}`}
                  onClick={() => setSel((prev) => ({ ...prev, tipo: "unidad", municipioId: undefined, casetaNombre: undefined }))}
                  disabled={!sel.zonaId}
                >
                  Unidad
                </button>
                <button
                  type="button"
                  className={`h-10 rounded-xl border px-3 text-sm transition-colors ${sel.tipo === "caseta" ? "border-ring ring-2 ring-ring-40" : "hover:bg-muted"}`}
                  onClick={() => setSel((prev) => ({ ...prev, tipo: "caseta", unidadNombre: undefined }))}
                  disabled={!sel.zonaId}
                >
                  Caseta
                </button>
              </div>
            </div>

            {/* Según tipo */}
            {sel.tipo === "unidad" && (
              <div className="space-y-2 md:max-w-lg">
                <label className="text-sm font-medium">Unidad</label>
                <select
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
                  value={sel.unidadNombre ?? ""}
                  onChange={(e) => setSel((prev) => ({ ...prev, unidadNombre: e.target.value || undefined }))}
                  disabled={!sel.zonaId}
                >
                  <option value="" disabled>
                    {sel.zonaId ? "Selecciona unidad…" : "Selecciona zona primero"}
                  </option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {sel.tipo === "caseta" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:max-w-3xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Municipio</label>
                  <select
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring-40 disabled:cursor-not-allowed disabled:opacity-50"
                    value={sel.municipioId ?? ""}
                    onChange={(e) => setSel((prev) => ({ ...prev, municipioId: e.target.value || undefined, casetaNombre: undefined }))}
                    disabled={!sel.zonaId}
                  >
                    <option value="" disabled>
                      {sel.zonaId ? "Selecciona municipio…" : "Selecciona zona primero"}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Caseta: si no hay casetas en el municipio seleccionado, mostramos aviso y ocultamos el selector */}
                {noCasetas ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Caseta</label>
                    <div className="text-sm font-black  text-red-500 foreground  px-3 py-2 bg-muted-50">
                      No hay caseta en este municipio.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Caseta</label>
                    <select
                      className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring-40 disabled:cursor-not-allowed disabled:opacity-50"
                      value={sel.casetaNombre ?? ""}
                      onChange={(e) => setSel((prev) => ({ ...prev, casetaNombre: e.target.value || undefined }))}
                      disabled={!sel.municipioId}
                    >
                      <option value="" disabled>
                        {sel.municipioId ? "Selecciona caseta…" : "Selecciona municipio primero"}
                      </option>
                      {casetas.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="h-px bg-border-70" />

            {/* Acciones */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {ready ? (
                  <span className="text-foreground">Todo listo 🎉</span>
                ) : (
                  "Completa los campos para continuar"
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setSel({}); setZonas([]); setMunicipios([]); setUnidades([]); setCasetas([]); }}>
                  Limpiar
                </Button>
                <Button onClick={goNext} disabled={!ready}>
                  Continuar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-muted-foreground text-center">
          INFOEX –  Incendios Forestales Extremadura -2025
        </div>
      </div>
    </main>
  );
}
