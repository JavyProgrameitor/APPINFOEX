// src/app/api/admin/invitar-usuario/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Este archivo usa la SUPABASE_SERVICE_ROLE_KEY — solo en el servidor
function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Body = { email: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Cliente con cookie del usuario actual
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Verificar rol del llamante
    const { data: auth } = await supabase.auth.getUser();
    const callerId = auth.user?.id;
    if (!callerId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("users")
      .select("rol")
      .eq("auth_user_id", callerId)
      .maybeSingle();

    if (me?.rol !== "admin") {
      return NextResponse.json({ error: "Solo ADMIN puede invitar" }, { status: 403 });
    }

    // Invitar usuario: envía correo de Supabase para establecer contraseña
    const admin = supabaseAdmin();
    const { data, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { rol: "bf" },
    });

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    // Actualizar tabla users a rol=bf
    const { error: updErr } = await supabase.from("users").update({ rol: "bf" }).eq("email", email);

    if (updErr) {
      return NextResponse.json(
        { ok: true, warning: `Invitado, pero no se actualizó users: ${updErr.message}` },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Invitación enviada a ${email}`,
      userId: data?.user?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
