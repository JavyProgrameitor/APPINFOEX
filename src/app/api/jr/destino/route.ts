// src/app/api/jr/destino/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // obtenemos el usuario
  const { data: { user }, } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "no-auth" }, { status: 401 });
  }

  // mis datos en tabla usuarios
  const { data: me, error } = await supabase
    .from("usuarios")
    .select("rol, unidad_id, caseta_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !me) {
    return NextResponse.json({ error: "no-user" }, { status: 400 });
  }

  if (me.rol !== "jr") {
    return NextResponse.json({ error: "not-jr" }, { status: 403 });
  }

  // caso 1: estoy asignado a UNA UNIDAD
  if (me.unidad_id) {
    const { data: unit } = await supabase
      .from("unidades")
      .select("id, nombre, zona")
      .eq("id", me.unidad_id)
      .maybeSingle();

    if (!unit) {
      return NextResponse.json({ error: "unit-not-found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        tipo: "unidad",
        zona: unit.zona,
        unidad_id: unit.id,
        unidad_nombre: unit.nombre,
        caseta_id: null,
        caseta_nombre: null,
      },
      { status: 200 }
    );
  }

  // caso 2: estoy asignado a UNA CASETA
  if (me.caseta_id) {
    // necesito caseta + municipio.zona
    const { data: caseta } = await supabase
      .from("casetas")
      .select("id, nombre, municipio_id")
      .eq("id", me.caseta_id)
      .maybeSingle();

    if (!caseta) {
      return NextResponse.json({ error: "caseta-not-found" }, { status: 404 });
    }

    const { data: muni } = await supabase
      .from("municipios")
      .select("id, nombre, zona")
      .eq("id", caseta.municipio_id)
      .maybeSingle();

    if (!muni) {
      return NextResponse.json({ error: "municipio-not-found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        tipo: "caseta",
        zona: muni.zona,
        unidad_id: null,
        unidad_nombre: null,
        caseta_id: caseta.id,
        caseta_nombre: caseta.nombre,
        municipio_id: muni.id,
        municipio_nombre: muni.nombre,
      },
      { status: 200 }
    );
  }

  // si llega aquí es que el admin no lo ha asignado a nada
  return NextResponse.json(
    { error: "jr-not-assigned" },
    { status: 409 }
  );
}
