import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Rol = "admin" | "bf" | "jr";
type Body = {
  email: string;
  password: string;            // requerido
  rol: Rol;
  dni?: string;
  nombre?: string;
  apellidos?: string;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ SOLO server
);

async function getRoleOfCurrentUser(): Promise<Rol | null> {
  const store = await cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (name: string, value: string, options: any) =>
          store.set({ name, value, ...options }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove: (name: string, options: any) =>
          store.set({ name, value: "", ...options, maxAge: 0 }),
      },
    }
  );

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const { data: rec } = await supa
    .from("users")
    .select("rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (rec?.rol as Rol) ?? null;
}

export async function POST(req: Request) {
  try {
    const callerRole = await getRoleOfCurrentUser();
    if (callerRole !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const { email, password, rol, dni, nombre, apellidos } = body;

    if (!email || !password || !rol) {
      return NextResponse.json({ error: "Faltan campos (email, password, rol)" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!["admin","bf","jr"].includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: rol },
      user_metadata: { rol, dni, nombre, apellidos },
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || "No se pudo crear el usuario (auth)" }, { status: 400 });
    }

    const auth_user_id = created.user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertPayload: any = {
      auth_user_id,
      rol,
      dni: dni ?? null,
      nombre: nombre ?? "",
      apellidos: apellidos ?? ""
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("users")
      .upsert(upsertPayload, { onConflict: "auth_user_id" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, auth_user_id }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("❌ Error inesperado:", e);
    return NextResponse.json({ error: "Error inesperado en servidor." }, { status: 500 });
  }
}
