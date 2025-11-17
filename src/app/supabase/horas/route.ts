import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'User ID requerido.' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('anotaciones')
    .select('horas_extras')
    .eq('users_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // sumar horas totales
  const total_horas = data.reduce((sum, row) => sum + Number(row.horas_extras || 0), 0)

  // cálculo automático
  const dias_libres = Math.floor(total_horas / 3.15)
  const horas_restantes = total_horas - dias_libres * 3.15

  return NextResponse.json({
    total_horas,
    dias_libres,
    horas_restantes: Number(horas_restantes.toFixed(2)),
  })
}
