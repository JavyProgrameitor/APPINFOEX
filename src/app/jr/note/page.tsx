// src/app/jr/note/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Use-toast";

type BomberoItem = { dni: string; nombre: string; apellidos: string };

type Anotacion = {
  users_id: string;
  fecha: string;
  codigo: string;
  hora_entrada: string;
  hora_salida: string;
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
const CODIGOS_PERMITIDOS = ["JR", "TH", "TC", "V", "AP"] as const;

function NoteJR() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

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
        setCtx(JSON.parse(raw) as JRContext);
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
        : ctx.caseta_id ||
          `C:${ctx.zona}/${ctx.municipio || ""}/${ctx.caseta || ""}`;
    return {
      storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
      anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
    };
  }, [ctx]);

  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setBomberos(raw ? (JSON.parse(raw) as BomberoItem[]) : []);
    } catch {
      setBomberos([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!bomberos) return;
    if (!anotStorageKey) return;

    try {
      const raw = localStorage.getItem(anotStorageKey);
      if (raw) {
        setAnotaciones(JSON.parse(raw));
        return;
      }
    } catch {}

    const hoy = new Date().toISOString().split("T")[0];
    const base: Record<string, Anotacion> = {};
    bomberos.forEach((b) => {
      base[b.dni] = {
        users_id: "",
        fecha: hoy,
        codigo: "JR",
        hora_entrada: "08:00",
        hora_salida: "15:00",
        horas_extras: 0,
      };
    });
    setAnotaciones(base);
  }, [bomberos, anotStorageKey]);

  useEffect(() => {
    const go = async () => {
      if (!bomberos || bomberos.length === 0) return;
      const copia = { ...anotaciones };
      for (const b of bomberos) {
        try {
          const res = await fetch(
            `/api/usuarios/dni?dni=${encodeURIComponent(b.dni)}`,
            { credentials: "include" }
          );
          if (res.ok) {
            const user = await res.json();
            if (!copia[b.dni]) {
              copia[b.dni] = {
                users_id: "",
                fecha: new Date().toISOString().split("T")[0],
                codigo: "JR",
                hora_entrada: "08:00",
                hora_salida: "15:00",
                horas_extras: 0,
              };
            }
            copia[b.dni].users_id = user.id;
          }
        } catch {}
      }
      setAnotaciones(copia);
      try {
        if (anotStorageKey)
          localStorage.setItem(anotStorageKey, JSON.stringify(copia));
      } catch {}
    };
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomberos]);

  useEffect(() => {
    try {
      if (anotStorageKey)
        localStorage.setItem(anotStorageKey, JSON.stringify(anotaciones));
    } catch {}
  }, [anotaciones, anotStorageKey]);

  const handleChange = (
    dni: string,
    field: keyof Anotacion,
    value: string | number
  ) => {
    setAnotaciones((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || {
          users_id: "",
          fecha: new Date().toISOString().split("T")[0],
          codigo: "JR",
          hora_entrada: "08:00",
          hora_salida: "15:00",
          horas_extras: 0,
        }),
        [field]: value,
      },
    }));
  };

  const guardarAnotacionesAhora = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const payload =
        (bomberos || [])
          .map((b) => anotaciones[b.dni])
          .filter((a): a is Anotacion => !!a && !!a.users_id) || [];

      if (payload.length === 0) {
        setMsg("No hay anotaciones válidas para guardar.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/jr/anotaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Error al guardar las anotaciones.");
        // toast destructivo
        toast({
          title: "No se pudo guardar",
          description: json.error || "Inténtalo de nuevo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Anotaciones guardadas",
          description: `Se guardaron ${
            json.inserted ?? payload.length
          } anotaciones correctamente.`,
        });
      }
    } catch {
      setMsg("Error de conexión con el servidor.");
      toast({
        title: "Sin conexión",
        description: "No se pudo contactar con el servidor.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const irASalidas = () => {
    if (!ctx) return router.push("/jr");
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
    if (!ctx) return router.push("/jr/add");
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
          No hay unidad o caseta seleccionada
          <Button className="ml-2" onClick={() => router.push("/jr")}>
            Ir a Inicio
          </Button>
        </div>
      </main>
    );
  }

  const listaCargando = bomberos === null;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
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
              <div className="text-sm text-muted-foreground">
                No hay unidad o caseta seleccionada
                <Button className="ml-2" onClick={() => router.push("/jr")}>
                  Ir a Inicio
                </Button>
              </div>
            ) : (
              <>
                {/* móvil */}
                <div className="md:hidden space-y-4">
                  {(bomberos || []).map((b) => {
                    const a = anotaciones[b.dni];
                    return (
                      <div
                        key={b.dni}
                        className="rounded-lg border bg-background p-3 space-y-2"
                      >
                        <div className="text-sm font-semibold">
                          {b.nombre} {b.apellidos}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.dni}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs">Fecha</label>
                            <Input
                              type="date"
                              value={a?.fecha || ""}
                              onChange={(e) =>
                                handleChange(b.dni, "fecha", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">Código</label>
                            <select
                              className="w-full border rounded px-2 py-1 text-sm bg-background"
                              value={a?.codigo || "JR"}
                              onChange={(e) =>
                                handleChange(b.dni, "codigo", e.target.value)
                              }
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
                                handleChange(
                                  b.dni,
                                  "hora_entrada",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">Salida</label>
                            <Input
                              type="time"
                              value={a?.hora_salida || ""}
                              onChange={(e) =>
                                handleChange(
                                  b.dni,
                                  "hora_salida",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">
                              Horas extras (día)
                            </label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.25"
                              min="0"
                              className="w-24 text-right"
                              value={a?.horas_extras ?? 0}
                              onChange={(e) =>
                                handleChange(
                                  b.dni,
                                  "horas_extras",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : 0
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
                        <th className="p-2">Apellidos</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Código</th>
                        <th className="p-2">Entrada</th>
                        <th className="p-2">Salida</th>
                        <th className="p-2">Horas extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bomberos || []).map((b) => {
                        const a = anotaciones[b.dni];
                        return (
                          <tr key={b.dni} className="border-t">
                            <td className="p-2 whitespace-nowrap">{b.dni}</td>
                            <td className="p-2 whitespace-nowrap">
                              {b.nombre}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {b.apellidos}
                            </td>
                            <td className="p-2">
                              <Input
                                type="date"
                                value={a?.fecha || ""}
                                onChange={(e) =>
                                  handleChange(b.dni, "fecha", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <select
                                className="border rounded px-2 py-1 text-sm bg-background"
                                value={a?.codigo || "JR"}
                                onChange={(e) =>
                                  handleChange(b.dni, "codigo", e.target.value)
                                }
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
                                  handleChange(
                                    b.dni,
                                    "hora_entrada",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="time"
                                value={a?.hora_salida || ""}
                                onChange={(e) =>
                                  handleChange(
                                    b.dni,
                                    "hora_salida",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.25"
                                min="0"
                                className="w-24 text-right"
                                value={a?.horas_extras ?? 0}
                                onChange={(e) =>
                                  handleChange(
                                    b.dni,
                                    "horas_extras",
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
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

                {msg && (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{msg}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={volverABomberos}>
                    Atrás
                  </Button>
                  <Button onClick={guardarAnotacionesAhora} disabled={saving}>
                    {saving ? "Guardando…" : "Guardar anotaciones ahora"}
                  </Button>
                  <Button onClick={irASalidas}>Siguiente: Salidas</Button>
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
