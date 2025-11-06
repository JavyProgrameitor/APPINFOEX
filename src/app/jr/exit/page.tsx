// src/app/jr/exit/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Use-toast";

type BomberoItem = { dni: string; nombre: string; apellidos: string };
type Anotacion = { users_id: string; fecha: string; codigo: string; hora_entrada: string; hora_salida: string; horas_extras: number };
type JRContext = { tipo: "unidad" | "caseta"; zona: string; municipio?: string; unidad?: string; caseta?: string; unidad_id?: string; caseta_id?: string; ls?: string };
type SalidaLinea = { tipo: "Incendio" | "Trabajo"; hora_salida: string; hora_entrada: string; lugar: string; num_intervienen: number };

const CTX_KEY = "INFOEX:jr:ctx";
const TIPOS_SALIDA = ["Incendio", "Trabajo"] as const;

function ExitJR() {
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
      const nuevo: JRContext = { tipo: urlTipo, zona: urlZona, municipio: urlMunicipio || undefined, unidad: urlUnidad || undefined, caseta: urlCaseta || undefined, unidad_id: urlUnidadId || undefined, caseta_id: urlCasetaId || undefined, ls: urlLs || undefined };
      setCtx(nuevo);
      try { localStorage.setItem(CTX_KEY, JSON.stringify(nuevo)); } catch {}
      return;
    }
    try { const raw = localStorage.getItem(CTX_KEY); if (raw) { setCtx(JSON.parse(raw) as JRContext); return; } } catch {}
    setCtx(null);
  }, [urlTipo, urlZona, urlMunicipio, urlUnidad, urlCaseta, urlUnidadId, urlCasetaId, urlLs]);

  const { storageKey, anotStorageKey, metaStorageKey } = useMemo(() => {
    if (!ctx) return { storageKey: null, anotStorageKey: null, metaStorageKey: null };
    const parte = ctx.tipo === "unidad" ? ctx.unidad_id || `U:${ctx.zona}/${ctx.unidad || ""}` : ctx.caseta_id || `C:${ctx.zona}/${ctx.municipio || ""}/${ctx.caseta || ""}`;
    return {
      storageKey: ctx.ls ? ctx.ls : `INFOEX:lista:${ctx.tipo}:${parte}`,
      anotStorageKey: `INFOEX:anotaciones:${ctx.tipo}:${parte}`,
      metaStorageKey: `INFOEX:meta:${ctx.tipo}:${parte}`,
    };
  }, [ctx]);

  const [bomberos, setBomberos] = useState<BomberoItem[]>([]);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({});
  const [salidas, setSalidas] = useState<SalidaLinea[]>([
    { tipo: "Trabajo", hora_salida: "15:00", hora_entrada: "08:00", lugar: "", num_intervienen: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try { const raw = localStorage.getItem(storageKey); if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) setBomberos(parsed); } } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!anotStorageKey) return;
    try { const raw = localStorage.getItem(anotStorageKey); if (raw) setAnotaciones(JSON.parse(raw) as Record<string, Anotacion>); } catch {}
  }, [anotStorageKey]);

  const totalBomberos = bomberos.length;
  const fecha = (() => {
    for (const b of bomberos) {
      const a = anotaciones[b.dni];
      if (a?.fecha) return a.fecha;
    }
    return new Date().toISOString().split("T")[0];
  })();

  const users_ids = bomberos.map((b) => anotaciones[b.dni]?.users_id).filter(Boolean) as string[];

  const addSalida = () => setSalidas((prev) => [...prev, { tipo: "Trabajo", hora_salida: "15:00", hora_entrada: "08:00", lugar: "", num_intervienen: 0 }]);
  const removeSalida = (idx: number) => setSalidas((prev) => prev.filter((_, i) => i !== idx));
  const changeSalida = <K extends keyof SalidaLinea>(idx: number, field: K, value: SalidaLinea[K]) =>
    setSalidas((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const volverAAnotaciones = () => {
    if (!ctx) return router.push("/jr/note");
    const sp = new URLSearchParams({
      tipo: ctx.tipo, zona: ctx.zona,
      municipio: ctx.municipio || "", unidad: ctx.unidad || "",
      caseta: ctx.caseta || "", unidad_id: ctx.unidad_id || "",
      caseta_id: ctx.caseta_id || "", ls: storageKey || "",
    });
    router.push(`/jr/note?${sp.toString()}`);
  };

  const guardarSalidas = async () => {
    setMsg(null); setLoading(true);
    try {
      const salidasPayload = salidas
        .map((s) => ({
          tipo: (s.tipo || "Trabajo") as "Incendio" | "Trabajo",
          hora_salida: s.hora_salida || "15:00",
          hora_entrada: s.hora_entrada || "08:00",
          lugar: s.lugar || "",
          num_intervienen: Math.max(0, Math.min(parseInt(String(s.num_intervienen || "0"), 10) || 0, totalBomberos)),
        }))
        .filter((s) => s.num_intervienen > 0); // no guardamos 0

      if (salidasPayload.length === 0) {
        setMsg("No hay salidas válidas (nº intervinientes debe ser > 0).");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/jr/salidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, users_ids, salidas: salidasPayload }),
      });

      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Error al guardar las salidas.");
        toast({
          title: "No se pudo guardar",
          description: json.error || "Inténtalo de nuevo.",
          variant: "destructive",
        });
      } else {
        if (metaStorageKey) {
          try {
            const raw = localStorage.getItem(metaStorageKey);
            const prev = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              metaStorageKey,
              JSON.stringify({
                ...prev,
                synced_at: new Date().toISOString(),
                salidas: (prev.salidas || 0) + (json.inserted_salidas ?? 0),
              })
            );
          } catch {}
        }
        toast({
          title: "Salidas guardadas",
          description: `Se guardaron ${json.inserted_salidas ?? 0} salidas correctamente.`,
        });
        router.push("/jr");
      }
    } catch {
      setMsg("Error de conexión con el servidor.");
      toast({
        title: "Sin conexión",
        description: "No se pudo contactar con el servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (ctx === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          No hay contexto de JR. Ve a la selección.
          <Button className="ml-2" onClick={() => router.push("/jr")}>Ir a JR</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={volverAAnotaciones}>2. Anotaciones</Button>
          <Button variant="outline" size="sm" className="font-semibold">3. Salidas</Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Salidas del día</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Fecha: <b>{fecha}</b> — Bomberos disponibles: <b>{totalBomberos}</b>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* ESCRITORIO */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Hora salida</th>
                    <th className="p-2">Hora entrada</th>
                    <th className="p-2">Lugar</th>
                    <th className="p-2">Nº intervinientes</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {salidas.map((s, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <select className="border rounded px-2 py-1 text-sm bg-background" value={s.tipo} onChange={(e) => changeSalida(idx, "tipo", e.target.value as "Incendio" | "Trabajo")}>
                          {TIPOS_SALIDA.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <Input type="time" className="w-28" value={s.hora_salida} onChange={(e) => changeSalida(idx, "hora_salida", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input type="time" className="w-28" value={s.hora_entrada} onChange={(e) => changeSalida(idx, "hora_entrada", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="max-w-xs" value={s.lugar} onChange={(e) => changeSalida(idx, "lugar", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          max={totalBomberos}
                          className="w-20 text-right"
                          value={s.num_intervienen}
                          onChange={(e) =>
                            changeSalida(
                              idx,
                              "num_intervienen",
                              Math.max(0, Math.min(parseInt(e.target.value || "0", 10) || 0, totalBomberos))
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Button variant="secondary" onClick={() => removeSalida(idx)}>Eliminar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MÓVIL */}
            <div className="md:hidden space-y-4">
              {salidas.map((s, idx) => (
                <div key={idx} className="rounded-xs border bg-background p-3 space-y-2">
                  <div>
                    <label className="text-xs">Tipo</label>
                    <select className="w-full border rounded px-2 py-1 text-sm bg-background" value={s.tipo} onChange={(e) => changeSalida(idx, "tipo", e.target.value as "Incendio" | "Trabajo")}>
                      {TIPOS_SALIDA.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Hora salida</label>
                      <Input type="time" className="w-full" value={s.hora_salida} onChange={(e) => changeSalida(idx, "hora_salida", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs">Hora entrada</label>
                      <Input type="time" className="w-full" value={s.hora_entrada} onChange={(e) => changeSalida(idx, "hora_entrada", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs">Lugar</label>
                    <Input className="w-full" value={s.lugar} onChange={(e) => changeSalida(idx, "lugar", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs">Nº intervinientes (0–{totalBomberos})</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      max={totalBomberos}
                      className="w-24 text-right"
                      value={s.num_intervienen}
                      onChange={(e) =>
                        changeSalida(
                          idx,
                          "num_intervienen",
                          Math.max(0, Math.min(parseInt(e.target.value || "0", 10) || 0, totalBomberos))
                        )
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => removeSalida(idx)}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>

            {msg && (
              <Alert variant="destructive">
                <AlertTitle>Atención</AlertTitle>
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button onClick={addSalida}>Añadir salida</Button>
              <div className="text-xs text-muted-foreground self-center">
                Fecha: <b>{fecha}</b> · Bomberos en lista: <b>{totalBomberos}</b>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={volverAAnotaciones}>Atrás</Button>
              <Button onClick={guardarSalidas} disabled={loading}>
                {loading ? "Guardando…" : "Guardar salidas"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {metaStorageKey ? (
          <small className="text-xs text-muted-foreground">
            Última subida en este dispositivo:{" "}
            {(() => {
              try {
                const raw = typeof window !== "undefined" ? localStorage.getItem(metaStorageKey) : null;
                if (!raw) return "—";
                const m = JSON.parse(raw);
                return `${m.synced_at ?? "—"} (salidas acumuladas: ${m.salidas ?? 0})`;
              } catch { return "—"; }
            })()}
          </small>
        ) : null}
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
