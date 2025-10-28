// src/app/api/registro/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey);

export async function POST(req: Request) {
  try {
    const { email } = (await req.json().catch(() => ({}))) as { email?: string };

    const normEmail = (email ?? "").toLowerCase().trim();
    if (!normEmail) {
      return NextResponse.json({ error: "Email es obligatorio." }, { status: 400 });
    }

    // Inserta SOLO email, dejando el default de rol = 'pending'
    const { data, error } = await supabase
      .from("users")
      .insert({ email: normEmail })
      .select("id, email, rol, creado_en, auth_user_id")
      .single();

    if (error) {
      // 23505 = UNIQUE violation (ya existe email)
      // 23503 = FK, etc. (no debería ocurrir aquí)
      const code = (error as any).code;
      if (code === "23505") {
        return NextResponse.json({ error: "Ese email ya tiene una solicitud." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || "No se pudo registrar." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, solicitud: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado." }, { status: 500 });
  }
}
