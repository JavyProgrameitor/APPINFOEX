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

function AgregarBomberos() {
  const router = useRouter();
  const params = useSearchParams();

  // --- Parámetros recibidos desde la página anterior ---
  const tipo = params.get("tipo"); // "unidad" | "caseta"
  const zonaNombre = params.get("zona") || "";
  const municipioNombre = params.get("municipio") || "";
  const unidadNombre = params.get("unidad") || "";
  const casetaNombre = params.get("caseta") || "";

  // IDs reales
  const unidadId = params.get("unidad_id") || "";
  const casetaId = params.get("caseta_id") || "";

  // si venimos de /jr/note nos puede traer la key exacta
  const forcedKey = params.get("ls");

  // 1) clave base (la que produciríamos nosotros)
  const baseKey = useMemo(() => {
    const parte =
      tipo === "unidad"
        ? unidadId || `U:${zonaNombre}/${unidadNombre}`
        : casetaId || `C:${zonaNombre}/${municipioNombre}/${casetaNombre}`;
    return `INFOEX:lista:${tipo}:${parte}`;
  }, [
    tipo,
    zonaNombre,
    municipioNombre,
    unidadNombre,
    casetaNombre,
    unidadId,
    casetaId,
  ]);

  // 2) clave definitiva que vamos a usar
  const [storageKey, setStorageKey] = useState<string | null>(null);

  // 3) la lista cargada (null = aún no la he cargado, [] = la he cargado vacía)
  const [listaBomberos, setListaBomberos] = useState<Bombero[] | null>(null);

  // 4) para saber si lo que hay en pantalla pertenece ya a *esa* clave
  const [loadedForKey, setLoadedForKey] = useState<string | null>(null);

  // 👇 decidir la key
  useEffect(() => {
    // prioridad 1: la que venga en la URL
    if (forcedKey) {
      setStorageKey(forcedKey);
      return;
    }

    // prioridad 2: si hay id real, usamos la base
    if (
      (tipo === "unidad" && unidadId) ||
      (tipo === "caseta" && casetaId)
    ) {
      setStorageKey(baseKey);
      return;
    }

    // prioridad 3: intentar buscar una que empiece por el prefijo
    try {
      const prefix = `INFOEX:lista:${tipo}:`;
      let found: string | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          found = k;
          break;
        }
      }
      setStorageKey(found || baseKey);
    } catch {
      setStorageKey(baseKey);
    }
  }, [forcedKey, baseKey, tipo, unidadId, casetaId]);

  // 👇 cargar la lista de ESA key (solo cuando la tengamos)
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
      setLoadedForKey(storageKey);
    } catch {
      setListaBomberos([]);
      setLoadedForKey(storageKey);
    }
  }, [storageKey]);

  // 👇 guardar solo cuando:
  // - tenemos key
  // - hemos cargado precisamente esa key
  // - tenemos lista (no es null)
  useEffect(() => {
    if (!storageKey) return;
    if (loadedForKey !== storageKey) return;
    if (listaBomberos === null) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(listaBomberos));
    } catch {
      // ignore
    }
  }, [listaBomberos, storageKey, loadedForKey]);

  // --- formulario ---
  const [dni, setDni] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregarBombero(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (!storageKey) return; // aún no sé dónde guardar

    const dniLimpio = dni.trim().toUpperCase();
    if (!dniLimpio) {
      setMensaje("Debes introducir un DNI.");
      return;
    }

    if (Array.isArray(listaBomberos) && listaBomberos.some((b) => b.dni === dniLimpio)) {
      setMensaje("Ya hay un bombero con ese DNI en la lista.");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`/api/usuarios/dni?dni=${encodeURIComponent(dniLimpio)}`, {
        credentials: "include",
      });

      if (res.status === 404) {
        setMensaje("Ese DNI no existe en INFOEX.");
        return;
      }

      const dbUser = await res.json();

      if (dbUser.rol !== "bf") {
        setMensaje("Solo puedes añadir Bomberos Forestales (bf).");
        return;
      }

      if (tipo === "unidad" && unidadId) {
        if (dbUser.unidad_id !== unidadId) {
          setMensaje("Ese bombero no pertenece a tu unidad.");
          return;
        }
      }
      if (tipo === "caseta" && casetaId) {
        if (dbUser.caseta_id !== casetaId) {
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
      console.error(err);
      setMensaje("Error al verificar el bombero. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function eliminarBombero(dni: string) {
    setListaBomberos((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.filter((b) => b.dni !== dni);
    });
  }

  // seguridad: si entra sin tipo → hacia /jr
  useEffect(() => {
    if (!tipo) {
      router.replace("/jr");
    }
  }, [tipo, router]);

  const tituloDestino =
    tipo === "unidad"
      ? `Unidad: ${unidadNombre || "(sin nombre)"}`
      : `Caseta: ${casetaNombre || "(sin nombre)"} — Municipio: ${municipioNombre || ""}`;

  // pasar a notas → le paso SIEMPRE la key que estoy usando
  const irANotas = () => {
    if (!storageKey) return;
    const sp = new URLSearchParams({
      tipo: tipo || "",
      zona: zonaNombre,
      municipio: municipioNombre,
      unidad: unidadNombre,
      caseta: casetaNombre,
      unidad_id: unidadId,
      caseta_id: casetaId,
      ls: storageKey,
    });
    router.push(`/jr/note?${sp.toString()}`);
  };

  const listaEstáCargando = listaBomberos === null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 md:p-10 space-y-4">
        {/* “paginación” arriba */}
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" className="font-semibold">
            1. Bomberos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!storageKey}
            onClick={irANotas}
          >
            2. Anotaciones
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Lista de Bomberos del Día</h1>
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{tituloDestino}</CardTitle>
            {storageKey && (
              <p className="text-[10px] text-muted-foreground break-all">
                clave usada: <code>{storageKey}</code>
              </p>
            )}
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
                <label className="text-sm font-medium">DNI</label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12345678A"
                />
              </div>
              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <Button type="submit" disabled={cargando || listaEstáCargando}>
                  {cargando ? "Verificando..." : "Añadir"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (confirm("¿Vaciar la lista guardada de este destino?")) {
                      setListaBomberos([]);
                    }
                  }}
                  disabled={listaEstáCargando}
                >
                  Vaciar
                </Button>
              </div>
            </form>

            {/* Lista */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {listaEstáCargando
                  ? "Cargando lista…"
                  : (listaBomberos?.length || 0) === 0
                  ? "No hay bomberos en la lista guardada."
                  : `Bomberos añadidos (${listaBomberos?.length || 0})`}
              </div>

              {/* móvil */}
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
                      <div className="text-xs text-muted-foreground">
                        {b.dni}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => eliminarBombero(b.dni)}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>

              {/* escritorio */}
              <div className="hidden md:block rounded-xl border bg-background overflow-x-auto">
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
                          onClick={() => eliminarBombero(b.dni)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => router.push("/jr")}>
                Atrás
              </Button>
              <Button onClick={irANotas} disabled={listaEstáCargando || (listaBomberos?.length || 0) === 0}>
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
