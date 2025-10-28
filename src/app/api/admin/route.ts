// src/app/api/admin/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey);

function genTempPassword() {
  return crypto.randomBytes(9).toString("base64url"); // ~12 chars legibles
}

// GET: por defecto, SOLO pendientes. Con ?all=1, todos.
// Pendiente = (auth_user_id IS NULL) OR (rol='pending' o 'pendiente')
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "1";

    let q = supabase
      .from("users")
      .select("id, email, rol, creado_en, auth_user_id")
      .order("creado_en", { ascending: true });

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = data ?? [];

    const solicitudes = await Promise.all(
      rows.map(async (r) => {
        // pending si no tiene auth_user_id o si el rol dice 'pending'
        const isPending =
          !r.auth_user_id ||
          (typeof r.rol === "string" &&
            ["pending", "pendiente"].includes(r.rol.toLowerCase()));

        // Rellena email desde Auth si falta
        let email: string | null = (r.email as string | null) ?? null;
        if (!email && r.auth_user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            r.auth_user_id as string
          );
          email = authUser?.user?.email ?? null;
        }

        return {
          id: r.id as string,
          email,
          created_at: r.creado_en as string,
          rol: (r.rol as string | null) ?? null,
          pending: isPending,
        };
      })
    );

    const filtered = showAll ? solicitudes : solicitudes.filter((s) => s.pending);

    return NextResponse.json(
      { solicitudes: filtered, meta: { total: filtered.length, modo: showAll ? "all" : "pending" } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado." }, { status: 500 });
  }
}

// PATCH: aprobar pendiente => crea en Auth y actualiza fila
// Body: { id, rol }
export async function PATCH(req: Request) {
  try {
    const { id, rol } = (await req.json().catch(() => ({}))) as {
      id?: string;
      rol?: "admin" | "jr" | "bf";
    };
    if (!id || !rol) return NextResponse.json({ error: "Faltan id y rol." }, { status: 400 });

    // Cargar fila aún pendiente (auth_user_id NULL o rol pending)
    const { data: row, error: fetchErr } = await supabase
      .from("users")
      .select("email, auth_user_id, rol")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    if (!row) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

    const wasPending =
      !row.auth_user_id ||
      (typeof row.rol === "string" &&
        ["pending", "pendiente"].includes(row.rol.toLowerCase()));
    if (!wasPending) {
      return NextResponse.json({ error: "La solicitud ya está aprobada." }, { status: 409 });
    }

    const email = (row.email ?? "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "La fila no tiene email." }, { status: 400 });

    // Crear en Auth con contraseña temporal
    const tempPass = genTempPassword();
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPass,
      email_confirm: true,
      app_metadata: { role: rol },
    });
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

    const authUserId = created.user?.id;
    if (!authUserId) return NextResponse.json({ error: "No se obtuvo id de Auth." }, { status: 500 });

    // Actualizar la fila
    const { error: updErr } = await supabase
      .from("users")
      .update({ auth_user_id: authUserId, rol })
      .eq("id", id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    return NextResponse.json(
      { ok: true, email, auth_user_id: authUserId, rol, temp_password: tempPass },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado." }, { status: 500 });
  }
}
