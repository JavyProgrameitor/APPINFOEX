// src/app/api/jr/salidas/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/server/server'

const TIPOS_SALIDA_PERMITIDOS = ['Extincion', 'Prevencion'] as const

type SalidaResumen = {
  tipo: string
  hora_salida: string // "HH:mm"
  hora_entrada: string // "HH:mm"
  lugar: string
  num_intervienen: number | string // puede venir como string del <input/>
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const fecha = (body?.fecha || '').toString().trim()
    const users_ids = Array.isArray(body?.users_ids) ? body.users_ids : []
    const salidas = Array.isArray(body?.salidas) ? (body.salidas as SalidaResumen[]) : []

    if (!fecha) {
      return NextResponse.json({ error: 'Falta la fecha.' }, { status: 400 })
    }
    if (salidas.length === 0) {
      return NextResponse.json({ error: 'No se recibieron salidas.' }, { status: 400 })
    }

    // 1) Traer anotaciones del día (para anclar la FK).
    let { data: anotaciones, error: anotErr } = await supabase
      .from('anotaciones')
      .select('id, users_id')
      .eq('fecha', fecha)

    if (anotErr) {
      console.error('Error al consultar anotaciones:', anotErr.message)
      return NextResponse.json({ error: anotErr.message }, { status: 500 })
    }

    anotaciones = anotaciones || []

    if (users_ids.length > 0) {
      const idxByUser: Record<string, number> = {}
      users_ids.forEach((u: string, i: number) => (idxByUser[u] = i))
      anotaciones.sort((a, b) => {
        const ia = idxByUser[a.users_id] ?? Number.MAX_SAFE_INTEGER
        const ib = idxByUser[b.users_id] ?? Number.MAX_SAFE_INTEGER
        return ia - ib
      })
    }

    const anchor = anotaciones[0]
    if (!anchor) {
      return NextResponse.json(
        {
          error: 'No existen anotaciones para esa fecha. Guarda anotaciones primero.',
        },
        { status: 400 },
      )
    }

    // 2) UNA fila por salida, y SOLO si num_intervienen > 0
    const rows = salidas
      .map((s) => {
        const tipo = (s.tipo || '').toString().trim().toLowerCase()
        const tipoVal = (TIPOS_SALIDA_PERMITIDOS as readonly string[]).includes(tipo)
          ? tipo
          : 'Extincion'

        const n = Math.max(0, parseInt(String(s.num_intervienen ?? '0'), 10) || 0)
        if (n <= 0) return null // << descartar

        return {
          anotacion_id: anchor.id,
          tipo: tipoVal,
          hora_salida: s.hora_salida || '15:00',
          hora_entrada: s.hora_entrada || '08:00',
          lugar: s.lugar || '',
          num_intervienen: n,
        }
      })
      .filter(Boolean) as Array<{
      anotacion_id: string
      tipo: string
      hora_salida: string
      hora_entrada: string
      lugar: string
      num_intervienen: number
    }>

    if (rows.length === 0) {
      // No hay nada válido que insertar; devolvemos OK con 0 inserts
      return NextResponse.json(
        {
          ok: true,
          inserted_salidas: 0,
          note: 'No se insertaron salidas con 0 intervinientes.',
        },
        { status: 200 },
      )
    }

    const { error: insErr } = await supabase.from('salidas').insert(rows)
    if (insErr) {
      console.error('Error al insertar salidas:', insErr.message)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted_salidas: rows.length }, { status: 200 })
  } catch (err: any) {
    console.error('Error inesperado:', err)
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor.' },
      { status: 500 },
    )
  }
}
