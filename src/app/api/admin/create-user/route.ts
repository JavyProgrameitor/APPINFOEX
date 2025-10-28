import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ solo en servidor
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      dni,
      nombre,
      apellidos,
      rol,        // "admin" | "bf" | "jr"
      unidad_id,  // opcional
      caseta_id,  // opcional
    } = body as {
      email: string;
      password: string;
      dni: string;
      nombre?: string;
      apellidos?: string;
      rol: "admin" | "bf" | "jr";
      unidad_id?: string;
      caseta_id?: string;
    };

    // Validaciones mínimas
    if (!email || !password || !dni || !rol) {
      return NextResponse.json(
        { error: "Faltan campos: email, password, dni y rol son obligatorios." },
        { status: 400 }
      );
    }

    console.log("ENV ok?", {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    // 1) Crear usuario en Auth (sin metadatos para evitar 500 raros).
    // Si esto funcionase y quieres meter metadatos, puedes añadirlos después.
    const { data: userData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // ponlo a true si necesitas correo de confirmación
      });

    if (authErr || !userData?.user) {
      console.error("❌ Auth createUser error:", authErr);
      // Devuelve 400 de verdad (no 200 con body)
      return NextResponse.json(
        {
          error:
            (authErr as any)?.message ||
            (authErr as any)?.error_description ||
            "No se pudo crear el usuario en Auth.",
          code: (authErr as any)?.code,
          status: (authErr as any)?.status,
        },
        { status: 400 }
      );
    }

    const auth_user_id = userData.user.id;
    console.log("✅ Usuario Auth creado:", auth_user_id);

    // 2) Insertar en public.users
    const { error: insertErr } = await supabaseAdmin.from("users").insert({
      auth_user_id,
      email,
      dni,
      nombre,
      apellidos,
      rol, // enum ('admin'|'bf'|'jr') debe existir exactamente en tu tipo rol
      unidad_id: (unidad_id || "").trim() || null,
      caseta_id: (caseta_id || "").trim() || null,
    });

    if (insertErr) {
      console.error("❌ Error insertando en public.users:", insertErr);
      return NextResponse.json(
        { error: insertErr.message },
        { status: 400 }
      );
    }

    // (Opcional) si quieres guardar rol también en app_metadata:
    // await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
    //   app_metadata: { role: rol }
    // });

    return NextResponse.json({ ok: true, auth_user_id }, { status: 200 });
  } catch (e: any) {
    console.error("❌ Error inesperado:", e);
    return NextResponse.json(
      { error: "Error inesperado en servidor." },
      { status: 500 }
    );
  }
}
