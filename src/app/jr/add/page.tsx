// src/app/jr/add/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Bombero = {
  dni: string;
  nombre: string;
  apellidos: string;
};

type JRContext = {
  tipo: "unidad" | "caseta";
  zona: string;
  municipio?: string;
  unidad?: string;
  caseta?: string;
  unidad_id?: string;
  caseta_id?: string;
  ls?: string; // clave explícita (opcional)
};

const CTX_KEY = "INFOEX:jr:ctx"; // <-- igual que /jr/page y /jr/note

// Genera la MISMA clave que espera /jr/note
function computeListaKey(ctx: JRContext | null): string | null {
  if (!ctx) return null;
  if (ctx.ls) return ctx.ls;
  const parte =
    ctx.tipo === "unidad"
      ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ""}`
      : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ""}/${ctx.caseta || ""}`;
  return `INFOEX:lista:${ctx.tipo}:${parte}`;
}

// Clave legacy que usabas antes (para migración transparente)
function computeLegacyKey(ctx: JRContext | null): string | null {
  if (!ctx) return null;
  const base = ctx.tipo === "unidad" ? `unidad:${ctx.unidad_id}` : `caseta:${ctx.caseta_id}`;
  return `jr.bomberos.${ctx.zona}.${base}`;
}

function groupByUnidad(usuarios: (Bombero & { unidad_id: string; unidad_nombre: string })[]) {
  const mapa: Record<string, { unidad_id: string; unidad_nombre: string; miembros: Bombero[] }> = {};
  for (const u of usuarios) {
    const key = u.unidad_id;
    if (!mapa[key]) {
      mapa[key] = { unidad_id: u.unidad_id, unidad_nombre: u.unidad_nombre, miembros: [] };
    }
    mapa[key].miembros.push({ dni: u.dni, nombre: u.nombre, apellidos: u.apellidos });
  }
  return Object.values(mapa);
}

function AgregarBomberos() {
  const router = useRouter();
  const params = useSearchParams();

  // 1) Cargar contexto desde URL o localStorage
  const urlTipo = params.get("tipo") as "unidad" | "caseta" | null;
  const urlZona = params.get("zona");
  const urlMunicipio = params.get("municipio");
  const urlUnidad = params.get("unidad");
  const urlCaseta = params.get("caseta");
  const urlUnidadId = params.get("unidad_id");
  const urlCasetaId = params.get("caseta_id");
  const urlLs = params.get("ls");

  const [ctx, setCtx] = useState<JRContext | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    // Prioridad a parámetros de URL
    if (urlTipo && urlZona) {
      const nuevo: JRContext = {
        tipo: urlTipo,
        zona: urlZona,
        municipio: urlMunicipio || undefined,
        unidad: urlUnidad || undefined,
        caseta: urlCaseta || undefined,
        unidad_id: urlUnidadId || undefined,
        caseta_id: urlCasetaId || undefined,
        ls: urlLs || undefined,
      };
      setCtx(nuevo);
      try {
        localStorage.setItem(CTX_KEY, JSON.stringify(nuevo));
      } catch { }
      return;
    }

    // Si no viene por URL, miro localStorage
    try {
      const raw = localStorage.getItem(CTX_KEY);
      if (raw) setCtx(JSON.parse(raw));
    } catch { }
  }, [urlTipo, urlZona, urlMunicipio, urlUnidad, urlCaseta, urlUnidadId, urlCasetaId, urlLs]);

  const storageKey = useMemo(() => computeListaKey(ctx), [ctx]);
  const legacyKey = useMemo(() => computeLegacyKey(ctx), [ctx]);

  // 2) Cargar selección previa (si existe) para esta clave (con migración desde la legacy)
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [, setListaInicial] = useState<Bombero[] | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    setLoadedKey(storageKey);
    try {
      // Primero intento con la clave nueva
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr: Bombero[] = JSON.parse(raw);
        setListaInicial(arr);
        const map: Record<string, boolean> = {};
        for (const b of arr) map[b.dni] = true;
        setSeleccion(map);
        return;
      }
      // Si no hay, intento migrar desde la clave legacy
      if (legacyKey) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          const arr: Bombero[] = JSON.parse(legacyRaw);
          setListaInicial(arr);
          const map: Record<string, boolean> = {};
          for (const b of arr) map[b.dni] = true;
          setSeleccion(map);
          // guardo inmediatamente en la nueva clave para unificar
          localStorage.setItem(storageKey, legacyRaw);
          return;
        }
      }
      setListaInicial([]);
      setSeleccion({});
    } catch {
      setListaInicial([]);
      setSeleccion({});
    }
  }, [storageKey, legacyKey]);

  // 3) Obtener miembros de la zona (sin pedir DNI)
  const [miembros, setMiembros] = useState<(Bombero & { unidad_id: string; unidad_nombre: string })[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!ctx?.zona) return;
      setCargando(true);
      setMensaje(null);
      try {
        // Usa el endpoint que tengas disponible. Si tu endpoint real es /api/usuarios/por-zona, cámbialo aquí.
        const res = await fetch(`/api/usuarios/zona?zona=${encodeURIComponent(ctx.zona)}`, { credentials: "include" });
        if (!res.ok) {
          setMensaje("No se pudieron cargar los miembros de la zona.");
          setMiembros([]);
          return;
        }
        const json = await res.json();
        const unidadesById: Record<string, string> = {};
        for (const u of json.unidades as { id: string; nombre: string }[]) {
          unidadesById[u.id] = u.nombre;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lista = (json.usuarios as any[]).map((u) => ({
          dni: u.dni,
          nombre: u.nombre,
          apellidos: u.apellidos,
          unidad_id: u.unidad_id,
          unidad_nombre: unidadesById[u.unidad_id] ?? "",
        }));
        setMiembros(lista);
      } catch {
        setMensaje("Error al cargar miembros.");
        setMiembros([]);
      } finally {
        setCargando(false);
      }
    })();
  }, [ctx?.zona]);

  // Grupos por unidad
  const grupos = useMemo(() => (miembros ? groupByUnidad(miembros) : []), [miembros]);

  // 4) Guardar selección en localStorage cuando cambie (con la clave NUEVA)
  useEffect(() => {
    if (!storageKey) return;
    if (loadedKey !== storageKey) return;
    if (!miembros) return;
    const seleccionados: Bombero[] = miembros
      .filter((m) => seleccion[m.dni])
      .map((m) => ({ dni: m.dni, nombre: m.nombre, apellidos: m.apellidos }));
    try {
      localStorage.setItem(storageKey, JSON.stringify(seleccionados));
    } catch { }
  }, [seleccion, storageKey, loadedKey, miembros]);

  const toggle = (dni: string) => {
    setSeleccion((prev) => ({ ...prev, [dni]: !prev[dni] }));
  };

  const limpiar = () => {
    setSeleccion({});
    try {
      if (storageKey) localStorage.removeItem(storageKey);
    } catch { }
  };

  const goNext = () => {
    router.push("/jr/note" + (ctx ? buildQueryFromCtx(ctx) : ""));
  };

  function buildQueryFromCtx(c: JRContext) {
    const p = new URLSearchParams();
    p.set("zona", c.zona);
    p.set("tipo", c.tipo);
    if (c.unidad) p.set("unidad", c.unidad);
    if (c.unidad_id) p.set("unidad_id", c.unidad_id);
    if (c.caseta) p.set("caseta", c.caseta);
    if (c.caseta_id) p.set("caseta_id", c.caseta_id);
    if (c.ls) p.set("ls", c.ls);
    return "?" + p.toString();
  }

  return (
    <>
    <main className=" grid place-items-center p-4 ">
      <Card className=" w-full max-w-3xl rounded-2xl">
        <CardHeader>
          <CardTitle>Seleccionar componentes (A y B) de la zona</CardTitle>
        </CardHeader>
        <CardContent>
          {!ctx ? (
            <div>Cargando contexto…</div>
          ) : cargando ? (
            <div>Cargando miembros…</div>
          ) : (
            <>
              {mensaje ? <div className="text-red-600 text-sm">{mensaje}</div> : null}

              {grupos.length === 0 ? (
                <div>No hay miembros para esta zona.</div>
              ) : (
                grupos.map((g) => (
                  <div key={g.unidad_id} className="p-3">
                    <div className="font-bold mb-2 mr-4 text-2xl">{g.unidad_nombre}</div>
                    <div className="text-xl grid grid-cols-1 md:grid-cols-2 gap-2">
                      {g.miembros.map((m) => (
                        <label key={m.dni} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!seleccion[m.dni]}
                            onChange={() => toggle(m.dni)}
                          />
                          <span>
                            {m.nombre} {m.apellidos}
                          </span>
                          <span className="text-sm text-gray-400 ml-2"><label>DNI : </label>{m.dni}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className="flex items-center gap-2">
                <Button type="button" onClick={goNext}>
                  Continuar
                </Button>
                <Button type="button" variant="outline" onClick={limpiar}>
                  Limpiar selección
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  </>

  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <AgregarBomberos />
    </Suspense>
  );
  
}
