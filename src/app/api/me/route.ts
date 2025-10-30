// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // en tu proyecto createClient() es async → hay que await
  const supabase = await createClient();

  // 1) ver si hay usuario autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // si el propio getUser falla, tratamos como no autenticado
  if (userError || !user) {
    return NextResponse.json(
      { email: null, rol: null },
      { status: 401 }
    );
  }

  // 2) buscar su rol en tu tabla users
  const { data: rec, error: roleError } = await supabase
    .from("users")
    .select("rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (roleError) {
    // si hay usuario pero no pudimos leer rol, devolvemos email y rol null
    return NextResponse.json(
      {
        email: user.email ?? null,
        rol: null,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      email: user.email ?? null,
      rol: (rec?.rol as "admin" | "jr" | "bf" | null) ?? null,
    },
    { status: 200 }
  );
}
