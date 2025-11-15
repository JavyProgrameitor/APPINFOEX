// src/app/api/usuarios/dni/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/server/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dni = searchParams.get('dni')
  if (!dni) {
    return NextResponse.json({ error: 'dni-required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('usuarios')
    .select('id, dni, nombre, apellidos, rol, unidad_id, caseta_id')
    .ilike('dni', dni)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 })
  }

  return NextResponse.json(user, { status: 200 })
}
