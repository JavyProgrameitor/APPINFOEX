// src/app/api/me/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/server/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { email: null, rol: null, unidad_id: null, caseta_id: null },
      { status: 401 },
    )
  }

  const { data: rec } = await supabase
    .from('usuarios')
    .select('rol, unidad_id, caseta_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return NextResponse.json(
    {
      email: user.email ?? null,
      rol: (rec?.rol as 'admin' | 'jr' | 'bf' | null) ?? null,
      unidad_id: rec?.unidad_id ?? null,
      caseta_id: rec?.caseta_id ?? null,
    },
    { status: 200 },
  )
}
