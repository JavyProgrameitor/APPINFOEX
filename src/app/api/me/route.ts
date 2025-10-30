// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { email: null, rol: null },
      { status: 200}
    );
  }

  const { data: rec } = await supabase
    .from("users")
    .select("rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return NextResponse.json(
    {
      email: user.email ?? null,
      rol: (rec?.rol as "admin" | "jr" | "bf" | null) ?? null,
    },
    { status: 200 }
  );
}
