// src/app/api/jr/proponer-usuario/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Body = {
  email: string;
  nombre?: string | null;
  apellidos?: string | null;
  unidad_id?: string | null;
  caseta_id?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const nombre = (body.nombre || "")?.trim() || null;
    const apellidos = (body.apellidos || "")?.trim() || null;
    const unidad_id = body.unidad_id || null;
    const caseta_id = body.caseta_id || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore).get(name)?.value;
          },
          async set(name: string, value: string, options: any) {
            (await cookieStore).set({ name, value, ...options });
          },
          async remove(name: string, options: any) {
            (await cookieStore).set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: auth } = await supabase.auth.getUser();
    const callerId = auth.user?.id;
    if (!callerId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("rol")
      .eq("auth_user_id", callerId)
      .maybeSingle();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 400 });
    }
    if (me?.rol !== "jr") {
      return NextResponse.json({ error: "Solo JR puede proponer usuarios" }, { status: 403 });
    }

    const { error: upsertErr } = await supabase
      .from("users")
      .upsert(
        {
          email,
          nombre,
          apellidos,
          unidad_id,
          caseta_id,
          rol: "pending",
        },
        { onConflict: "email" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
