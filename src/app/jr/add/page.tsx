// src/app/jr/add/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  ls?: string;
};

const CTX_KEY = "INFOEX:jr:ctx";

function AgregarBomberos() {
  const router = useRouter();
  const params = useSearchParams();

  // 1) intentamos leer de la URL
  const urlTipo = params.get("tipo") as "unidad" | "caseta" | null;
  const urlZona = params.get("zona");
  const urlMunicipio = params.get("municipio");
  const urlUnidad = params.get("unidad");
  const urlCaseta = params.get("caseta");
  const urlUnidadId = params.get("unidad_id");
  const urlCasetaId = params.get("caseta_id");
  const urlLs = params.get("ls");

  // 2) estado con el contexto “real” que vamos a usar
  const [ctx, setCtx] = useState<JRContext | null>(null);

  // 3) al montar: si la URL trae datos -> los uso y LOS GUARDO como contexto
  useEffect(() => {
    // ¿viene algo por URL?
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
      } catch {}
      return;
    }

    // si NO viene por URL, miro el localStorage
    try {
      const raw = localStorage.getItem(CTX_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as JRContext;
        setCtx(saved);
        return;
      }
    } catch {}

    // si tampoco hay contexto guardado -> manda a /jr
    setCtx(null);
  }, [
    urlTipo,
    urlZona,
    urlMunicipio,
    urlUnidad,
    urlCaseta,
    urlUnidadId,
    urlCasetaId,
    urlLs,
  ]);

  // 4) lista de bomberos
  const [listaBomberos, setListaBomberos] = useState<Bombero[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // 5) calcular la clave de lista, PERO ya con el contexto
  const storageKey = useMemo(() => {
    if (!ctx) return null;
    if (ctx.ls) return ctx.ls; // clave pasada por URL o guardada
    const parte =
      ctx.tipo === "unidad"
        ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ""}`
        : ctx.caseta_id ||
          `C:${ctx.zona}/${ctx.municipio || ""}/${ctx.caseta || ""}`;
    return `INFOEX:lista:${ctx.tipo}:${parte}`;
  }, [ctx]);

  // 6) cargar la lista cuando tengamos clave
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setListaBomberos(parsed);
        } else {
          setListaBomberos([]);
        }
      } else {
        setListaBomberos([]);
      }
      setLoadedKey(storageKey);
    } catch {
      setListaBomberos([]);
      setLoadedKey(storageKey);
    }
  }, [storageKey]);

  // 7) guardar solo si hemos cargado esa misma key
  useEffect(() => {
    if (!storageKey) return;
    if (loadedKey !== storageKey) return;
    if (listaBomberos === null) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(listaBomberos));
    } catch {}
  }, [listaBomberos, storageKey, loadedKey]);

  // --- formulario ---
  const [dni, setDni] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregarBombero(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (!ctx) return;
    if (!storageKey) return;

    const dniLimpio = dni.trim().toUpperCase();
    if (!dniLimpio) {
      setMensaje("Debes introducir un DNI.");
      return;
    }

    if (
      Array.isArray(listaBomberos) &&
      listaBomberos.some((b) => b.dni === dniLimpio)
    ) {
      setMensaje("Ya hay un bombero con ese DNI en la lista.");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(
        `/api/usuarios/dni?dni=${encodeURIComponent(dniLimpio)}`,
        {
          credentials: "include",
        }
      );

      if (res.status === 404) {
        setMensaje("Ese DNI no existe en INFOEX.");
        return;
      }

      const dbUser = await res.json();

      if (ctx.tipo === "unidad" && ctx.unidad_id) {
        if (dbUser.unidad_id !== ctx.unidad_id) {
          setMensaje("Ese bombero no pertenece a tu unidad.");
          return;
        }
      }
      if (ctx.tipo === "caseta" && ctx.caseta_id) {
        if (dbUser.caseta_id !== ctx.caseta_id) {
          setMensaje("Ese bombero no pertenece a tu caseta.");
          return;
        }
      }

      const nuevo: Bombero = {
        dni: dniLimpio,
        nombre: dbUser.nombre,
        apellidos: dbUser.apellidos,
      };

      setListaBomberos((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        return [...base, nuevo];
      });
      setDni("");
    } catch (err) {
      setMensaje("Error al verificar el bombero.");
    } finally {
      setCargando(false);
    }
  }

  if (ctx === null) {
    // ni URL ni contexto → mándalo al inicio JR
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          No hay unidad o caseta definida
          <Button className="ml-2" onClick={() => router.push("/jr")}>
            Ir a Inicio
          </Button>
        </div>
      </main>
    );
  }

  const tituloDestino =
    ctx.tipo === "unidad"
      ? `Unidad: ${ctx.unidad || "(sin nombre)"}`
      : `Caseta: ${ctx.caseta || "(sin nombre)"} — Municipio: ${
          ctx.municipio || ""
        }`;

  const irANotas = () => {
    if (!ctx) return;
    if (!storageKey) return;
    const sp = new URLSearchParams({
      tipo: ctx.tipo,
      zona: ctx.zona,
      municipio: ctx.municipio || "",
      unidad: ctx.unidad || "",
      caseta: ctx.caseta || "",
      unidad_id: ctx.unidad_id || "",
      caseta_id: ctx.caseta_id || "",
      ls: storageKey,
    });
    router.push(`/jr/note?${sp.toString()}`);
  };

  const listaEstaCargando = listaBomberos === null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-4">
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm">
            1. Bomberos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={irANotas}
            disabled={!storageKey}
          >
            2. Anotaciones
          </Button>
        </div>

        <h1 className="text-xl font-semibold">Lista de Bomberos del Día</h1>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{tituloDestino}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mensaje && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {mensaje}
              </div>
            )}

            {/* Formulario */}
            <form
              onSubmit={agregarBombero}
              className="grid grid-cols-1 md:grid-cols-5 gap-3"
            >
              <div className="space-y-1 md:col-span-3">
                <label className="text-xl font-medium">DNI</label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="************"
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2 justify-end">
                <Button type="submit" disabled={cargando || listaEstaCargando}>
                  {cargando ? "Verificando..." : "Añadir"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (confirm("¿Vaciar la lista?")) setListaBomberos([]);
                  }}
                  disabled={listaEstaCargando}
                >
                  Vaciar
                </Button>
              </div>
            </form>

            {/* Lista (móvil) */}
            <div className="md:hidden space-y-3">
              {(listaBomberos || []).map((b) => (
                <div
                  key={b.dni}
                  className="rounded-lg border bg-background px-3 py-2 flex justify-between gap-3 items-center"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {b.nombre} {b.apellidos}
                    </div>
                    <div className="text-xs text-muted-foreground">{b.dni}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setListaBomberos((prev) =>
                        (prev || []).filter((x) => x.dni !== b.dni)
                      )
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>

            {/* Lista (desktop) */}
            <div className="hidden md:block border bg-background overflow-x-auto">
              <div className="grid grid-cols-12 px-3 py-2 text-xs font-medium bg-muted">
                <div className="col-span-3">DNI</div>
                <div className="col-span-4">Nombre</div>
                <div className="col-span-4">Apellidos</div>
                <div className="col-span-1 text-right">Acción</div>
              </div>
              <div className="divide-y">
                {(listaBomberos || []).map((b) => (
                  <div
                    key={b.dni}
                    className="grid grid-cols-12 px-3 py-2 text-sm items-center"
                  >
                    <div className="col-span-3">{b.dni}</div>
                    <div className="col-span-4">{b.nombre}</div>
                    <div className="col-span-4">{b.apellidos}</div>
                    <div className="col-span-1 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setListaBomberos((prev) =>
                            (prev || []).filter((x) => x.dni !== b.dni)
                          )
                        }
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => router.push("/jr")}>
                Atrás
              </Button>
              <Button
                onClick={irANotas}
                disabled={
                  listaEstaCargando || (listaBomberos || []).length === 0
                }
              >
                Continuar
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
      <AgregarBomberos />
    </Suspense>
  );
}
