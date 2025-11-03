// src/app/jr/note/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type BomberoItem = {
  dni: string;
  nombre: string;
  apellidos: string;
};

type Anotacion = {
  users_id: string;
  fecha: string;
  codigo: string;
  hora_entrada: string;
  hora_salida: string;
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
const CODIGOS_PERMITIDOS = ["JR", "TH", "TC", "V", "AP","B"] as const;

function NoteJR() {
  const router = useRouter();
  const params = useSearchParams();

  const urlTipo = params.get("tipo") as "unidad" | "caseta" | null;
  const urlZona = params.get("zona");
  const urlMunicipio = params.get("municipio");
  const urlUnidad = params.get("unidad");
  const urlCaseta = params.get("caseta");
  const urlUnidadId = params.get("unidad_id");
  const urlCasetaId = params.get("caseta_id");
  const urlLs = params.get("ls");

  const [ctx, setCtx] = useState<JRContext | null>(null);

  useEffect(() => {
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

    try {
      const raw = localStorage.getItem(CTX_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as JRContext;
        setCtx(saved);
        return;
      }
    } catch {}

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

  // claves de storage
  const { storageKey, anotStorageKey } = useMemo(() => {
    if (!ctx) return { storageKey: null, anotStorageKey: null };
    const parte =
      ctx.tipo === "unidad"
        ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ""}`
        : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ""}/${ctx.caseta || ""}`;
    return {
      storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
      anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
    };
  }, [ctx]);

  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({});
  const [msg, setMsg] = useState<string | null>(null);

  // cargar bomberos
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setBomberos(parsed);
        } else {
          setBomberos([]);
        }
      } else {
        setBomberos([]);
      }
    } catch {
      setBomberos([]);
    }
  }, [storageKey]);

  // crear anotaciones base o cargar las guardadas
  useEffect(() => {
    if (!bomberos) return;
    if (!anotStorageKey) return;
    // primero intento leer las que ya había
    try {
      const rawAnot = localStorage.getItem(anotStorageKey);
      if (rawAnot) {
        const parsed = JSON.parse(rawAnot) as Record<string, Anotacion>;
        setAnotaciones(parsed);
        return;
      }
    } catch {
      // si falla, sigo abajo y creo de cero
    }

    const hoy = new Date().toISOString().split("T")[0];
    const base: Record<string, Anotacion> = {};
    bomberos.forEach((b) => {
      base[b.dni] = {
        users_id: "",
        fecha: hoy,
        codigo: "JR",
        hora_entrada: "08:00",
        hora_salida: "15:00",
    
      };
    });
    setAnotaciones(base);
  }, [bomberos, anotStorageKey]);

  // resolver ids reales
  useEffect(() => {
    const resolver = async () => {
      if (!bomberos || bomberos.length === 0) return;
      const copia: Record<string, Anotacion> = { ...anotaciones };
      for (const b of bomberos) {
        try {
          const res = await fetch(`/api/usuarios/dni?dni=${encodeURIComponent(b.dni)}`, {
            credentials: "include",
          });
          if (res.ok) {
            const user = await res.json();
            if (!copia[b.dni]) {
              copia[b.dni] = {
                users_id: "",
                fecha: new Date().toISOString().split("T")[0],
                codigo: "JR",
                hora_entrada: "08:00",
                hora_salida: "15:00",
              
              };
            }
            copia[b.dni].users_id = user.id;
          }
        } catch {
          // ignore
        }
      }
      setAnotaciones(copia);
      // guardar en local
      if (anotStorageKey) {
        try {
          localStorage.setItem(anotStorageKey, JSON.stringify(copia));
        } catch {}
      }
    };
    resolver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomberos]);

  // guardar en local cada vez que cambie
  useEffect(() => {
    if (!anotStorageKey) return;
    try {
      localStorage.setItem(anotStorageKey, JSON.stringify(anotaciones));
    } catch {}
  }, [anotaciones, anotStorageKey]);

  const handleChange = (dni: string, field: keyof Anotacion, value: string | number) => {
    setAnotaciones((prev) => {
      const nuevo = {
        ...(prev[dni] || {
          users_id: "",
          fecha: new Date().toISOString().split("T")[0],
          codigo: "JR",
          hora_entrada: "08:00",
          hora_salida: "15:00",
          horas_extras: 0,
        }),
        [field]: value,
      };
      const copia = { ...prev, [dni]: nuevo };
      return copia;
    });
  };

  const irASalidas = () => {
    if (!ctx) {
      router.push("/jr");
      return;
    }
    const sp = new URLSearchParams({
      tipo: ctx.tipo,
      zona: ctx.zona,
      municipio: ctx.municipio || "",
      unidad: ctx.unidad || "",
      caseta: ctx.caseta || "",
      unidad_id: ctx.unidad_id || "",
      caseta_id: ctx.caseta_id || "",
      ls: storageKey || "",
    });
    router.push(`/jr/exit?${sp.toString()}`);
  };

  const volverABomberos = () => {
    if (!ctx) {
      router.push("/jr/add");
      return;
    }
    const sp = new URLSearchParams({
      tipo: ctx.tipo,
      zona: ctx.zona,
      municipio: ctx.municipio || "",
      unidad: ctx.unidad || "",
      caseta: ctx.caseta || "",
      unidad_id: ctx.unidad_id || "",
      caseta_id: ctx.caseta_id || "",
      ls: storageKey || "",
    });
    router.push(`/jr/add?${sp.toString()}`);
  };

  if (ctx === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          No hay contexto de JR. Ve a la selección.
          <Button className="ml-2" onClick={() => router.push("/jr")}>
            Ir a JR
          </Button>
        </div>
      </main>
    );
  }

  const listaCargando = bomberos === null;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* paginación */}
        <div className="flex gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={volverABomberos}>
            1. Bomberos
          </Button>
          <Button variant="outline" size="sm" className="font-semibold">
            2. Anotaciones
          </Button>
          <Button variant="ghost" size="sm" onClick={irASalidas}>
            3. Salidas
          </Button>
        </div>

        <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Anotaciones del día</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {listaCargando ? (
                <p className="text-sm text-muted-foreground">Cargando lista…</p>
              ) : (bomberos || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay bomberos. Vuelve <b>Agregar</b>.
                </p>
              ) : (
                <>
                  {/* móvil */}
                  <div className="md:hidden space-y-4">
                    {(bomberos || []).map((b) => {
                      const a = anotaciones[b.dni];
                      return (
                        <div key={b.dni} className="rounded-lg border bg-background p-3 space-y-2">
                          <div className="text-sm font-semibold">
                            {b.nombre} {b.apellidos}
                          </div>
                          <div className="text-xs text-muted-foreground">{b.dni}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs">Fecha</label>
                              <Input
                                type="date"
                                value={a?.fecha || ""}
                                onChange={(e) => handleChange(b.dni, "fecha", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs">Código</label>
                              <select
                                className="w-full border rounded px-2 py-1 text-sm bg-background"
                                value={a?.codigo || "JR"}
                                onChange={(e) => handleChange(b.dni, "codigo", e.target.value)}
                              >
                                {CODIGOS_PERMITIDOS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs">Entrada</label>
                              <Input
                                type="time"
                                value={a?.hora_entrada || ""}
                                onChange={(e) =>
                                  handleChange(b.dni, "hora_entrada", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="text-xs">Salida</label>
                              <Input
                                type="time"
                                value={a?.hora_salida || ""}
                                onChange={(e) =>
                                  handleChange(b.dni, "hora_salida", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* escritorio */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted text-left">
                          <th className="p-2">DNI</th>
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Apellidos</th>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Código</th>
                          <th className="p-2">Entrada</th>
                          <th className="p-2">Salida</th>
                          <th className="p-2">Extras (→ Salidas)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(bomberos || []).map((b) => {
                          const a = anotaciones[b.dni];
                          return (
                            <tr key={b.dni} className="border-t">
                              <td className="p-2 whitespace-nowrap">{b.dni}</td>
                              <td className="p-2 whitespace-nowrap">{b.nombre}</td>
                              <td className="p-2 whitespace-nowrap">{b.apellidos}</td>
                              <td className="p-2">
                                <Input
                                  type="date"
                                  value={a?.fecha || ""}
                                  onChange={(e) => handleChange(b.dni, "fecha", e.target.value)}
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  className="border rounded px-2 py-1 text-sm bg-background"
                                  value={a?.codigo || "JR"}
                                  onChange={(e) => handleChange(b.dni, "codigo", e.target.value)}
                                >
                                  {CODIGOS_PERMITIDOS.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="time"
                                  value={a?.hora_entrada || ""}
                                  onChange={(e) =>
                                    handleChange(b.dni, "hora_entrada", e.target.value)
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="time"
                                  value={a?.hora_salida || ""}
                                  onChange={(e) =>
                                    handleChange(b.dni, "hora_salida", e.target.value)
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {msg && <div className="text-red-600 text-sm">{msg}</div>}

                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={volverABomberos}>
                      Atrás
                    </Button>
                    <Button onClick={irASalidas}>
                      Siguiente: Salidas
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <NoteJR />
    </Suspense>
  );
}
