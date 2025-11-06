// src/app/jr/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const CTX_KEY = "INFOEX:jr:ctx";

type DestinoJR =
  | {
      tipo: "unidad";
      zona: string;
      unidad_id: string;
      unidad_nombre: string;
    }
  | {
      tipo: "caseta";
      zona: string;
      caseta_id: string;
      caseta_nombre: string;
      municipio_id: string;
      municipio_nombre: string;
    };

export default function StartJR() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [destino, setDestino] = useState<DestinoJR | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga de sesión + destino (sin auto-redirect)
  useEffect(() => {
    (async () => {
      // 1) comprobar sesión + rol
      const meRes = await fetch("/api/me", { credentials: "include" });
      if (meRes.status !== 200) {
        router.replace("/");
        return;
      }
      const me = await meRes.json();
      if (me.rol !== "jr") {
        router.replace("/");
        return;
      }

      // 2) pedir destino
      const destRes = await fetch("/api/jr/destino", { credentials: "include" });
      const djson = await destRes.json();

      if (!destRes.ok) {
        setError("No tienes una unidad/caseta asignada. Contacta con administración.");
        setLoading(false);
        return;
      }

      if (djson.tipo === "unidad") {
        setDestino({
          tipo: "unidad",
          zona: djson.zona,
          unidad_id: djson.unidad_id,
          unidad_nombre: djson.unidad_nombre,
        });
      } else {
        setDestino({
          tipo: "caseta",
          zona: djson.zona,
          caseta_id: djson.caseta_id,
          caseta_nombre: djson.caseta_nombre,
          municipio_id: djson.municipio_id,
          municipio_nombre: djson.municipio_nombre,
        });
      }

      setLoading(false);
    })();
  }, [router]);

  // Guardar contexto en localStorage cuando esté listo (NO navegamos)
  useEffect(() => {
    if (loading || !destino) return;
    const ctx =
      destino.tipo === "unidad"
        ? {
            tipo: "unidad" as const,
            zona: destino.zona,
            unidad: destino.unidad_nombre,
            unidad_id: destino.unidad_id,
          }
        : {
            tipo: "caseta" as const,
            zona: destino.zona,
            municipio: destino.municipio_nombre,
            caseta: destino.caseta_nombre,
            caseta_id: destino.caseta_id,
          };
    try {
      localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
    } catch {}
  }, [loading, destino]);

  const goNext = () => {
    if (!destino) return;

    const params = new URLSearchParams();
    params.set("zona", destino.zona);
    if (destino.tipo === "unidad") {
      params.set("tipo", "unidad");
      params.set("unidad", destino.unidad_nombre);
      params.set("unidad_id", destino.unidad_id);
    } else {
      params.set("tipo", "caseta");
      params.set("municipio", destino.municipio_nombre);
      params.set("caseta", destino.caseta_nombre);
      params.set("caseta_id", destino.caseta_id);
    }
    router.push(`/jr/add?${params.toString()}`);
  };

  if (loading) return null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>DESTINO ASIGNADO: </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : destino ? (
              <>
                {/* Zona (bloqueada) */}
                <div className="space-y-1 md:max-w-lg">
                  <label className="text-sm font-medium">Zona</label>
                  <input
                    value={destino.zona}
                    disabled
                    className="h-10 w-full rounded-xl border-2 bg-muted px-3 text-sm"
                  />
                </div>

                {/* Tipo y destino */}
                {destino.tipo === "unidad" ? (
                  <div className="space-y-1 md:max-w-lg">
                    <label className="text-sm font-medium">Unidad asignada</label>
                    <input
                      value={destino.unidad_nombre}
                      disabled
                      className="h-10 w-full rounded-xl border-2 bg-muted px-3 text-sm"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:max-w-3xl">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Municipio</label>
                      <input
                        value={destino.municipio_nombre}
                        disabled
                        className="h-10 w-full rounded-xl border-2 bg-muted px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Caseta</label>
                      <input
                        value={destino.caseta_nombre}
                        disabled
                        className="h-10 w-full rounded-xl border-2 bg-muted px-3 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={goNext}>Continuar</Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
