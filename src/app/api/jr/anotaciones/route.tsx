// src/app/api/jr/anotaciones/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CODIGOS_PERMITIDOS = ["JR", "TH", "TC", "V", "AP","B"] as const;
const TIPOS_SALIDA_PERMITIDOS = ["incendio", "trabajo"] as const;

type AnotacionPayload = {
  users_id: string;
  fecha: string; // YYYY-MM-DD
  codigo: string;
  hora_entrada: string;
  hora_salida: string;
};

type SalidaPayload = {
  anotacion_index: number; // índice dentro del array de anotaciones insertadas
  tipo: string;
  hora_salida: string;
  hora_entrada: string;
  lugar: string;
  horas_extras?: number;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // ---- CASO 1: formato antiguo: array plano de anotaciones
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json(
          { error: "No hay datos válidos para insertar." },
          { status: 400 }
        );
      }

      const anotacionesLimpias = body.map((item: any) => {
        if (!item.users_id || !item.fecha) {
          throw new Error("Faltan campos obligatorios en los datos.");
        }

        const codigoRecibido = (item.codigo || "").toString().trim().toUpperCase();
        const codigoValido = CODIGOS_PERMITIDOS.includes(
          codigoRecibido as (typeof CODIGOS_PERMITIDOS)[number]
        )
          ? codigoRecibido
          : "JR";

        return {
          users_id: item.users_id,
          fecha: item.fecha,
          codigo: codigoValido,
          hora_entrada: item.hora_entrada ?? "08:00",
          hora_salida: item.hora_salida ?? "15:00",
          // aunque seguirá existiendo en la tabla, lo mandamos a 0 porque
          // las horas extras se gestionan en salidas
          //horas_extras: 0,
        };
      });

      const { error } = await supabase.from("anotaciones").insert(anotacionesLimpias);
      if (error) {
        console.error("Error al insertar anotaciones:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        { ok: true, inserted: anotacionesLimpias.length },
        { status: 200 }
      );
    }

    // ---- CASO 2: formato nuevo: { anotaciones: [...], salidas: [...] }
    const { anotaciones, salidas } = body as {
      anotaciones: AnotacionPayload[];
      salidas: SalidaPayload[];
    };

    if (!Array.isArray(anotaciones) || anotaciones.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron anotaciones." },
        { status: 400 }
      );
    }

    // 1) limpiar anotaciones
    const anotacionesLimpias = anotaciones.map((item) => {
      if (!item.users_id || !item.fecha) {
        throw new Error("Faltan campos obligatorios en las anotaciones.");
      }
      const codigoRecibido = (item.codigo || "").toString().trim().toUpperCase();
      const codigoValido = CODIGOS_PERMITIDOS.includes(
        codigoRecibido as (typeof CODIGOS_PERMITIDOS)[number]
      )
        ? codigoRecibido
        : "JR";

      return {
        users_id: item.users_id,
        fecha: item.fecha,
        codigo: codigoValido,
        hora_entrada: item.hora_entrada ?? "08:00",
        hora_salida: item.hora_salida ?? "15:00",
       // horas_extras: 0,
      };
    });

    // 2) insertamos anotaciones y pedimos que nos devuelva los ids
    const { data: insertedAnotaciones, error: anotError } = await supabase
      .from("anotaciones")
      .insert(anotacionesLimpias)
      .select(); // 👈 para poder enlazar las salidas

    if (anotError) {
      console.error("Error al insertar anotaciones:", anotError.message);
      return NextResponse.json({ error: anotError.message }, { status: 500 });
    }

    // si no hay salidas → terminamos
    if (!Array.isArray(salidas) || salidas.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          inserted_anotaciones: insertedAnotaciones?.length ?? 0,
          inserted_salidas: 0,
        },
        { status: 200 }
      );
    }

    // 3) limpiar salidas y enlazarlas
    const salidasLimpias = salidas
      .map((s) => {
        // proteger índice
        const anot = insertedAnotaciones?.[s.anotacion_index];
        if (!anot) return null;

        const tipoRecibido = (s.tipo || "").toString().trim().toLowerCase();
        const tipoValido = TIPOS_SALIDA_PERMITIDOS.includes(
          tipoRecibido as (typeof TIPOS_SALIDA_PERMITIDOS)[number]
        )
          ? tipoRecibido
          : "incendio"; // por defecto

        return {
          anotacion_id: anot.id,
          tipo: tipoValido,
          hora_salida: s.hora_salida ?? anot.hora_salida ?? "15:00",
          hora_entrada: s.hora_entrada ?? anot.hora_entrada ?? "08:00",
          lugar: s.lugar ?? "",
          horas_extras: typeof s.horas_extras === "number" ? s.horas_extras : 0,
        };
      })
      .filter(Boolean) as Array<{
      anotacion_id: string;
      tipo: string;
      hora_salida: string;
      hora_entrada: string;
      lugar: string;
      horas_extras: number;
    }>;

    if (salidasLimpias.length > 0) {
      const { error: salError } = await supabase.from("salidas").insert(salidasLimpias);
      if (salError) {
        console.error("Error al insertar salidas:", salError.message);
        return NextResponse.json({ error: salError.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        inserted_anotaciones: insertedAnotaciones?.length ?? 0,
        inserted_salidas: salidasLimpias.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error inesperado:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
