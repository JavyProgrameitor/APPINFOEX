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
  horas_extras: number;
};

function NoteJR() {
  const router = useRouter();
  const params = useSearchParams();

  const tipo = params.get("tipo");
  const zonaNombre = params.get("zona") || "";
  const municipioNombre = params.get("municipio") || "";
  const unidadNombre = params.get("unidad") || "";
  const casetaNombre = params.get("caseta") || "";
  const unidadId = params.get("unidad_id") || "";
  const casetaId = params.get("caseta_id") || "";
  const forcedKey = params.get("ls");

  // misma clave que en /jr/add
  const storageKey = useMemo(() => {
    if (forcedKey) return forcedKey;
    const parte =
      tipo === "unidad"
        ? unidadId || `U:${zonaNombre}/${unidadNombre}`
        : casetaId || `C:${zonaNombre}/${municipioNombre}/${casetaNombre}`;
    return `INFOEX:lista:${tipo}:${parte}`;
  }, [
    forcedKey,
    tipo,
    zonaNombre,
    municipioNombre,
    unidadNombre,
    casetaNombre,
    unidadId,
    casetaId,
  ]);

  const [bomberos, setBomberos] = useState<BomberoItem[] | null>(null);
  const [anotaciones, setAnotaciones] = useState<Record<string, Anotacion>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 1) cargar lista
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

  // 2) crear anotaciones base cuando tenga bomberos
  useEffect(() => {
    if (!bomberos) return;
    const hoy = new Date().toISOString().split("T")[0];
    const base: Record<string, Anotacion> = {};
    bomberos.forEach((b) => {
      base[b.dni] = {
        users_id: "",
        fecha: hoy,
        codigo: "",
        hora_entrada: "08:00",
        hora_salida: "15:00",
        horas_extras: 0,
      };
    });
    setAnotaciones(base);
  }, [bomberos]);

  // 3) resolver users_id real
  useEffect(() => {
    const resolver = async () => {
      if (!bomberos || bomberos.length === 0) return;
      const copia: Record<string, Anotacion> = { ...anotaciones };
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
                codigo: "",
                hora_entrada: "08:00",
                hora_salida: "15:00",
                horas_extras: 0,
              };
            }
            copia[b.dni].users_id = user.id;
          }
        } catch {
          // ignore
        }
      }
      setAnotaciones(copia);
    };

    resolver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomberos]);

  const handleChange = (dni: string, field: keyof Anotacion, value: string | number) => {
    setAnotaciones((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || {
          users_id: "",
          fecha: new Date().toISOString().split("T")[0],
          codigo: "",
          hora_entrada: "08:00",
          hora_salida: "15:00",
          horas_extras: 0,
        }),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setMsg(null);
    setLoading(true);

    try {
      const payload =
        bomberos
          ?.map((b) => anotaciones[b.dni])
          .filter((a): a is Anotacion => !!a && !!a.users_id) || [];

      if (payload.length === 0) {
        setMsg("No hay datos válidos para guardar.");
        setLoading(false);
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
      } else {
        alert(`Se guardaron ${json.inserted} anotaciones correctamente.`);
        router.push("/jr");
      }
    } catch (err) {
      setMsg("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const volverABomberos = () => {
    if (!storageKey) {
      router.push("/jr/add");
      return;
    }
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
    router.push(`/jr/add?${sp.toString()}`);
  };

  const listaCargandose = bomberos === null;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* “paginación” arriba */}
        <div className="flex gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={volverABomberos}>
            1. Bomberos
          </Button>
          <Button variant="outline" size="sm" className="font-semibold">
            2. Anotaciones
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Anotaciones del día</CardTitle>
            {storageKey && (
              <p className="text-[10px] text-muted-foreground break-all">
                clave usada: <code>{storageKey}</code>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {listaCargandose ? (
              <p className="text-sm text-muted-foreground">Cargando lista…</p>
            ) : (bomberos || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay bomberos en la lista. Regresa a <b>/jr/add</b>.
              </p>
            ) : (
              <>
                {/* móvil: tarjetas */}
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
                              onChange={(e) =>
                                handleChange(b.dni, "fecha", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs">Código</label>
                            <Input
                              value={a?.codigo || ""}
                              onChange={(e) =>
                                handleChange(b.dni, "codigo", e.target.value)
                              }
                            />
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
                          <div>
                            <label className="text-xs">Extras</label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={a?.horas_extras ?? 0}
                              onChange={(e) =>
                                handleChange(
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
                        <th className="p-2">Apellidos</th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Código</th>
                        <th className="p-2">Entrada</th>
                        <th className="p-2">Salida</th>
                        <th className="p-2">Extras</th>
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
                                onChange={(e) =>
                                  handleChange(b.dni, "fecha", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="text"
                                value={a?.codigo || ""}
                                onChange={(e) =>
                                  handleChange(b.dni, "codigo", e.target.value)
                                }
                              />
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
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={a?.horas_extras ?? 0}
                                onChange={(e) =>
                                  handleChange(
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
                  <Button variant="secondary" onClick={volverABomberos}>
                    Atrás
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Guardando..." : "Guardar todas"}
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
