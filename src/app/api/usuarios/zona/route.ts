// src/app/api/usuarios/zona/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const zona = searchParams.get('zona')
  if (!zona) {
    return NextResponse.json({ error: 'zona-required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1) Unidades de la zona
  const { data: unidades, error: uErr } = await supabase
    .from('unidades')
    .select('id, nombre, zona')
    .eq('zona', zona)

  if (uErr) {
    return NextResponse.json({ error: 'supabase-error', details: uErr.message }, { status: 500 })
  }
  if (!unidades || unidades.length === 0) {
    return NextResponse.json({ usuarios: [], unidades: [] }, { status: 200 })
  }

  const unidadIds = unidades.map((u) => u.id)

  // 2) Usuarios de esas unidades
  const { data: usuarios, error: usrErr } = await supabase
    .from('usuarios')
    .select('id, dni, nombre, apellidos, unidad_id')
    .in('unidad_id', unidadIds)
    .order('nombre', { ascending: true })

  if (usrErr) {
    return NextResponse.json({ error: 'supabase-error', details: usrErr.message }, { status: 500 })
  }

  return NextResponse.json({ usuarios: usuarios ?? [], unidades: unidades ?? [] }, { status: 200 })
}
