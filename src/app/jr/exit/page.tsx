
// src/app/jr/exit/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
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
  horas_extras: number;
};

type SalidaForm = {
  tipo: "incendio" | "trabajo";
  hora_salida: string;
  hora_entrada: string;
  lugar: string;
  horas_extras: number;
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
const TIPOS_SALIDA = ["incendio", "trabajo"] as const;

function ExitJR() {
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

  const [bomberos, setBomberos] = useState<BomberoItem[]>([]);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({});
  const [salidas, setSalidas] = useState<Record<string, SalidaForm>>({});
  const [loading, setLoading] = useState(false);
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

  // cargar anotaciones
  useEffect(() => {
    if (!anotStorageKey) return;
    try {
      const raw = localStorage.getItem(anotStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Anotacion>;
        setAnotaciones(parsed);
      }
    } catch {}
  }, [anotStorageKey]);

  // inicializar salidas
  useEffect(() => {
    if (!bomberos || bomberos.length === 0) return;
    const base: Record<string, SalidaForm> = {};
    bomberos.forEach((b) => {
      const anot = anotaciones[b.dni];
      base[b.dni] = {
        tipo: "incendio",
        // por defecto usamos las horas de la anotación
        hora_salida: anot?.hora_salida || "15:00",
        hora_entrada: anot?.hora_entrada || "08:00",
        lugar: "",
        horas_extras: anot?.horas_extras ?? 0,
      };
    });
    setSalidas(base);
  }, [bomberos, anotaciones]);

  const handleSalidaChange = (
    dni: string,
    field: keyof SalidaForm,
    value: string | number
  ) => {
    setSalidas((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || {
          tipo: "incendio",
          hora_salida: "15:00",
          hora_entrada: "08:00",
          lugar: "",
          horas_extras: 0,
        }),
        [field]: value,
      },
    }));
  };

  const guardarTodo = async () => {
    setMsg(null);
    setLoading(true);

    try {
      // construir anotaciones en orden de bomberos
      const anotList: Anotacion[] = [];
      const salidasList: Array<{
        anotacion_index: number;
        tipo: string;
        hora_salida: string;
        hora_entrada: string;
        lugar: string;
        horas_extras: number;
      }> = [];

      bomberos.forEach((b, index) => {
        const anot = anotaciones[b.dni];
        if (!anot || !anot.users_id) {
          return;
        }

        // anotación (sin horas extras, porque van en salidas)
        anotList.push({
          users_id: anot.users_id,
          fecha: anot.fecha,
          codigo: anot.codigo,
          hora_entrada: anot.hora_entrada,
          hora_salida: anot.hora_salida,
          horas_extras: 0, // ← nos lo llevamos a salidas
        });

        const sal = salidas[b.dni];
        // solo creamos salida si hay algún dato especial o hay horas extras
        if (sal && (sal.lugar || (sal.horas_extras ?? 0) > 0 || sal.tipo !== "trabajo")) {
          salidasList.push({
            anotacion_index: index,
            tipo: sal.tipo,
            hora_salida: sal.hora_salida,
            hora_entrada: sal.hora_entrada,
            lugar: sal.lugar || "",
            horas_extras: typeof sal.horas_extras === "number" ? sal.horas_extras : 0,
          });
        }
      });

      if (anotList.length === 0) {
        setMsg("No hay anotaciones válidas para guardar.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/jr/anotaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anotaciones: anotList,
          salidas: salidasList,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Error al guardar los datos.");
      } else {
        alert(
          `Se guardaron ${json.inserted_anotaciones ?? json.inserted ?? anotList.length
          } anotaciones y ${json.inserted_salidas ?? salidasList.length} salidas.`
        );
        router.push("/jr");
      }
    } catch (err) {
      setMsg("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const volverAAnotaciones = () => {
    if (!ctx) {
      router.push("/jr/note");
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
    router.push(`/jr/note?${sp.toString()}`);
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

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* paginación */}
        <div className="flex gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={volverAAnotaciones}>
            2. Anotaciones
          </Button>
          <Button variant="outline" size="sm" className="font-semibold">
            3. Salidas
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Salidas del día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bomberos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay bomberos. Vuelve <b>Agregar</b>.
              </p>
            ) : (
              <>
                {/* móvil */}
                <div className="md:hidden space-y-4">
                  {bomberos.map((b) => {
                    const s = salidas[b.dni];
                    return (
                      <div key={b.dni} className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="text-sm font-semibold">
                          {b.nombre} {b.apellidos}
                        </div>
                        <div className="text-xs text-muted-foreground">{b.dni}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs">Tipo</label>
                            <select
                              className="w-full border rounded px-2 py-1 text-sm bg-background"
                              value={s?.tipo || "trabajo"}
                              onChange={(e) =>
                                handleSalidaChange(b.dni, "tipo", e.target.value as any)
                              }
                            >
                              {TIPOS_SALIDA.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs">Hora salida</label>
                            <Input
                              type="time"
                              value={s?.hora_salida || ""}
                              onChange={(e) =>
                                handleSalidaChange(b.dni, "hora_salida", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">Hora entrada</label>
                            <Input
                              type="time"
                              value={s?.hora_entrada || ""}
                              onChange={(e) =>
                                handleSalidaChange(b.dni, "hora_entrada", e.target.value)
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs">Lugar</label>
                            <Input
                              value={s?.lugar || ""}
                              onChange={(e) =>
                                handleSalidaChange(b.dni, "lugar", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">Horas extras</label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={s?.horas_extras ?? 0}
                              onChange={(e) =>
                                handleSalidaChange(
                                  b.dni,
                                  "horas_extras",
                                  e.target.value ? parseFloat(e.target.value) : 0
                                )
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
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Salida</th>
                        <th className="p-2">Entrada</th>
                        <th className="p-2">Lugar</th>
                        <th className="p-2">Horas extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomberos.map((b) => {
                        const s = salidas[b.dni];
                        return (
                          <tr key={b.dni} className="border-t">
                            <td className="p-2 whitespace-nowrap">{b.dni}</td>
                            <td className="p-2 whitespace-nowrap">
                              {b.nombre} {b.apellidos}
                            </td>
                            <td className="p-2">
                              <select
                                className="border rounded px-2 py-1 text-sm bg-background"
                                value={s?.tipo || "trabajo"}
                                onChange={(e) =>
                                  handleSalidaChange(b.dni, "tipo", e.target.value as any)
                                }
                              >
                                {TIPOS_SALIDA.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="time"
                                value={s?.hora_salida || ""}
                                onChange={(e) =>
                                  handleSalidaChange(b.dni, "hora_salida", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="time"
                                value={s?.hora_entrada || ""}
                                onChange={(e) =>
                                  handleSalidaChange(b.dni, "hora_entrada", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s?.lugar || ""}
                                onChange={(e) =>
                                  handleSalidaChange(b.dni, "lugar", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={s?.horas_extras ?? 0}
                                onChange={(e) =>
                                  handleSalidaChange(
                                    b.dni,
                                    "horas_extras",
                                    e.target.value ? parseFloat(e.target.value) : 0
                                  )
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
                  <Button variant="secondary" onClick={volverAAnotaciones}>
                    Atrás
                  </Button>
                  <Button onClick={guardarTodo} disabled={loading}>
                    {loading ? "Guardando..." : "Guardar todo"}
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
      <ExitJR />
    </Suspense>
  );
}
