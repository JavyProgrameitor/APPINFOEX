// src/app/api/jr/anotaciones/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "No hay datos válidos para insertar." }, { status: 400 });
    }

    // Validar estructura mínima
    for (const item of body) {
      if (!item.users_id || !item.fecha || !item.codigo) {
        return NextResponse.json({ error: "Faltan campos obligatorios en los datos." }, { status: 400 });
      }
    }

    const { error } = await supabase.from("anotaciones").insert(body);

    if (error) {
      console.error("Error al insertar anotaciones:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: body.length }, { status: 200 });
  } catch (err) {
    console.error("Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
