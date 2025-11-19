import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID requerido.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Ahora necesitamos horas_extras y codigo para saber cuántos días se han consumido (H)
  const { data, error } = await supabase
    .from('anotaciones')
    .select('horas_extras,codigo')
    .eq('users_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      total_horas: 0,
      dias_libres: 0,
      horas_restantes: 0,
    })
  }

  // 1) Sumar todas las horas extra (> 0)
  const total_horas = data.reduce((sum, row) => {
    const h = Number(row.horas_extras || 0)
    return h > 0 ? sum + h : sum
  }, 0)

  // 2) Calcular días generados por horas extra
  const UMBRAL_DIA = 3.15
  const dias_generados = Math.floor(total_horas / UMBRAL_DIA)

  // 3) Contar días consumidos por horas extra (codigo = 'H')
  const dias_consumidos = data.filter((row) => row.codigo === 'H').length

  // 4) Días libres disponibles (no negativos)
  const dias_libres = Math.max(dias_generados - dias_consumidos, 0)

  // 5) Horas restantes para el PRÓXIMO día (respecto al total generado)
  const horas_restantes_brutas = total_horas - dias_generados * UMBRAL_DIA
  const horas_restantes = horas_restantes_brutas < 0 ? 0 : Number(horas_restantes_brutas.toFixed(2))

  return NextResponse.json({
    total_horas: Number(total_horas.toFixed(2)),
    dias_libres,
    horas_restantes,
  })
}
