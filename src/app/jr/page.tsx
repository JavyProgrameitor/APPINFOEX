"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Tipo = "unidad" | "caseta";

type Zona = string;
type Municipio = { id: string; nombre: string; zona: Zona };
type Unidad = { id: string; nombre: string; zona: Zona };
type Caseta = { id: string; nombre: string; municipio_id: string };

type Selection = {
  zona?: Zona;
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

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [casetas, setCasetas] = useState<Caseta[]>([]);

  // 👇 Helper para el borde de los selects
  const selectBase =
    "h-10 w-full rounded-xl border-2 bg-background px-3 text-sm outline-none ring-offset-background transition-colors " +
    "focus-visible:ring-2 focus-visible:ring-ring-40 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
  const selectClass = (isSelected: boolean) =>
    `${selectBase} ${isSelected ? "border-white" : "border-green-600"}`;

  // Cargar zonas
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_zonas_enum");
      if (!error && Array.isArray(data)) {
        setZonas(data as Zona[]);
      }
    })();
  }, []);

  // Cuando cambia zona, cargar municipios y unidades
  useEffect(() => {
    if (!sel.zona) {
      setMunicipios([]); setUnidades([]); setCasetas([]);
      return;
    }
    (async () => {
      const [{ data: mData }, { data: uData }] = await Promise.all([
        supabase.from("municipios").select("id,nombre,zona").eq("zona", sel.zona).order("nombre", { ascending: true }),
        supabase.from("unidades").select("id,nombre,zona").eq("zona", sel.zona).order("nombre", { ascending: true }),
      ]);
      if (mData) setMunicipios(mData as Municipio[]);
      if (uData) setUnidades(uData as Unidad[]);
    })();
  }, [sel.zona]);

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

  const noCasetas = sel.tipo === "caseta" && !!sel.municipioId && casetas.length === 0;

  const ready =
    !!sel.zona &&
    !!sel.tipo &&
    ((sel.tipo === "unidad" && !!sel.unidadNombre) ||
      (sel.tipo === "caseta" && !!sel.municipioId && !!sel.casetaNombre));

  function goNext() {
    const zonaNombre = sel.zona;
    const municipioNombre = municipios.find(m => m.id === sel.municipioId)?.nombre;

    const params = new URLSearchParams();
    if (zonaNombre) params.set("zona", zonaNombre);
    if (municipioNombre) params.set("municipio", municipioNombre || "");
    if (sel.tipo) params.set("tipo", sel.tipo);
    if (sel.unidadNombre) params.set("unidad", sel.unidadNombre || "");
    if (sel.casetaNombre) params.set("caseta", sel.casetaNombre || "");
    router.push(`/jr/add?${params.toString()}`);
  }

  if (authed === null) return null;

  return (
    <main className="min-h-screen  dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <Card className="shadow-xl border-border dark:border-border">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl md:text-3xl tracking-tight">
              Selecciona tu destino
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Zona */}
            <div className="space-y-2 md:max-w-lg">
              <label htmlFor="zona-select" className="text-sm font-medium">Zona</label>
              <select
                id="zona-select"
                className={selectClass(!!sel.zona)}
                value={sel.zona ?? ""}
                onChange={(e) => {
                  const value = e.target.value || undefined;
                  setSel({ zona: value, tipo: undefined, municipioId: undefined, unidadNombre: undefined, casetaNombre: undefined });
                }}
              >
                <option value="" disabled>Selecciona zona…</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de puesto</label>
              <div className="grid grid-cols-2 gap-2 md:max-w-sm">
                <Button
                  type="button"
                  variant="outline"
                  className={`h-10 rounded-xl px-3 text-sm transition-colors 
                text-white cursor-pointer bg-green-600 hover:bg-green-800
                disabled:cursor-not-allowed
                ${sel.tipo === "unidad" ? "ring-2 ring-ring-40 bg-green-600" : ""}`}
                  onClick={() =>
                    setSel((prev) => ({
                      ...prev,
                      tipo: "unidad",
                      municipioId: undefined,
                      casetaNombre: undefined,
                    }))
                  }
                  disabled={!sel.zona}
                >
                  Unidad
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`h-10 rounded-xl px-3 text-sm transition-colors 
                text-white cursor-pointer bg-green-600 hover:bg-green-800
                disabled:cursor-not-allowed
                ${sel.tipo === "caseta" ? "ring-2 ring-ring-40 bg-green-600" : ""}`}
                  onClick={() =>
                    setSel((prev) => ({
                      ...prev,
                      tipo: "caseta",
                      unidadNombre: undefined,
                    }))
                  }
                  disabled={!sel.zona}
                >
                  Caseta
                </Button>
              </div>
            </div>
            {/* Según tipo */}
            {sel.tipo === "unidad" && (
              <div className="space-y-2 md:max-w-lg">
                <label htmlFor="unidad-select" className="text-sm font-medium">Unidad</label>
                <select
                  id="unidad-select"
                  className={selectClass(!!sel.unidadNombre)}
                  value={sel.unidadNombre ?? ""}
                  onChange={(e) => setSel((prev) => ({ ...prev, unidadNombre: e.target.value || undefined }))}
                  disabled={!sel.zona}
                >
                  <option value="" disabled>
                    {sel.zona ? "Selecciona unidad…" : "Selecciona zona primero"}
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
                  <label htmlFor="municipio-select" className="text-sm font-medium">Municipio</label>
                  <select
                    id="municipio-select"
                    className={selectClass(!!sel.municipioId)}
                    value={sel.municipioId ?? ""}
                    onChange={(e) => setSel((prev) => ({ ...prev, municipioId: e.target.value || undefined, casetaNombre: undefined }))}
                    disabled={!sel.zona}
                  >
                    <option value="" disabled>
                      {sel.zona ? "Selecciona municipio…" : "Selecciona zona primero"}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {noCasetas ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Caseta</label>
                    <div className="text-sm font-black text-foreground px-3 py-2 bg-muted-50">
                      No hay caseta en este municipio.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="caseta-select" className="text-sm font-medium">Caseta</label>
                    <select
                      id="caseta-select"
                      className={selectClass(!!sel.casetaNombre)}
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

            <div className="h-px" />

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
                <Button
                  variant="secondary"
                  onClick={() => { setSel({}); setMunicipios([]); setUnidades([]); setCasetas([]); }}
                >
                  Limpiar
                </Button>
                <Button onClick={goNext} disabled={!ready}>
                  Continuar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
