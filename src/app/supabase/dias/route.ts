// src/app/supabase/dias/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/server/server'

const VACACIONES_ANUALES = 22
const AP_ANUALES = 7

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get('userId')
    const yearParam = searchParams.get('year')

    if (!userId) {
      return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 })
    }

    const now = new Date()
    const year = yearParam ? parseInt(yearParam, 10) || now.getFullYear() : now.getFullYear()

    const from = `${year}-01-01`
    const toExclusive = `${year + 1}-02-01`

    const { data, error } = await supabase
      .from('anotaciones')
      .select('codigo,fecha')
      .eq('users_id', userId)
      .gte('fecha', from)
      .lt('fecha', toExclusive)

    if (error) {
      console.error('Error obteniendo anotaciones para días V/AP:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let usadosV = 0
    let usadosAP = 0

    for (const row of data ?? []) {
      const cod = String(row.codigo || '').toUpperCase()
      if (cod === 'V') usadosV += 1
      if (cod === 'AP') usadosAP += 1
    }

    const restantesV = Math.max(0, VACACIONES_ANUALES - usadosV)
    const restantesAP = Math.max(0, AP_ANUALES - usadosAP)

    return NextResponse.json(
      {
        year,
        vacaciones: {
          total: VACACIONES_ANUALES,
          usados: usadosV,
          restantes: restantesV,
        },
        asuntosPropios: {
          total: AP_ANUALES,
          usados: usadosAP,
          restantes: restantesAP,
        },
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('Error en GET /supabase/dias:', err)
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor.' },
      { status: 500 },
    )
  }
}
