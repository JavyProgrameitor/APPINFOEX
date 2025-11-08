// src/app/api/jr/anotaciones/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CODIGOS_PERMITIDOS = ['JR', 'TH', 'TC', 'V', 'AP', 'B'] as const
const TIPOS_SALIDA_PERMITIDOS = ['incendio', 'trabajo'] as const

type AnotacionPayload = {
  users_id: string
  fecha: string // YYYY-MM-DD
  codigo: string
  hora_entrada: string // HH:mm
  hora_salida: string // HH:mm
  horas_extras: number // en anotaciones
}

type SalidaResumen = {
  tipo: string // "incendio" | "trabajo"
  hora_salida: string // HH:mm
  hora_entrada: string // HH:mm
  lugar: string
  num_intervienen: number | string // puede venir como string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    // ---- CASO LEGACY: array plano de anotaciones
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: 'No hay datos válidos para insertar.' }, { status: 400 })
      }

      const anotacionesLimpias = body.map((item: any) => {
        if (!item.users_id || !item.fecha) {
          throw new Error('Faltan campos obligatorios en los datos.')
        }
        const codigoRecibido = (item.codigo || '').toString().trim().toUpperCase()
        const codigoValido = CODIGOS_PERMITIDOS.includes(
          codigoRecibido as (typeof CODIGOS_PERMITIDOS)[number],
        )
          ? codigoRecibido
          : 'JR'

        return {
          users_id: item.users_id,
          fecha: item.fecha,
          codigo: codigoValido,
          hora_entrada: item.hora_entrada ?? '08:00',
          hora_salida: item.hora_salida ?? '15:00',
          horas_extras:
            typeof item.horas_extras === 'number'
              ? item.horas_extras
              : Number(item.horas_extras) || 0,
        }
      })

      const { error } = await supabase.from('anotaciones').insert(anotacionesLimpias)
      if (error) {
        console.error('Error al insertar anotaciones:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, inserted: anotacionesLimpias.length }, { status: 200 })
    }

    // ---- FORMATO NUEVO: { anotaciones, salidas }
    const { anotaciones, salidas } = body as {
      anotaciones: AnotacionPayload[]
      salidas?: SalidaResumen[]
    }

    if (!Array.isArray(anotaciones) || anotaciones.length === 0) {
      return NextResponse.json({ error: 'No se recibieron anotaciones.' }, { status: 400 })
    }

    // 1) limpiar anotaciones
    const anotacionesLimpias = anotaciones.map((item) => {
      if (!item.users_id || !item.fecha) {
        throw new Error('Faltan campos obligatorios en las anotaciones.')
      }
      const codigoRecibido = (item.codigo || '').toString().trim().toUpperCase()
      const codigoValido = CODIGOS_PERMITIDOS.includes(
        codigoRecibido as (typeof CODIGOS_PERMITIDOS)[number],
      )
        ? codigoRecibido
        : 'JR'

      return {
        users_id: item.users_id,
        fecha: item.fecha,
        codigo: codigoValido,
        hora_entrada: item.hora_entrada ?? '08:00',
        hora_salida: item.hora_salida ?? '15:00',
        horas_extras:
          typeof item.horas_extras === 'number'
            ? item.horas_extras
            : Number(item.horas_extras) || 0,
      }
    })

    // 2) insert anotaciones con retorno de IDs
    const { data: insertedAnot, error: anotErr } = await supabase
      .from('anotaciones')
      .insert(anotacionesLimpias)
      .select()

    if (anotErr) {
      console.error('Error al insertar anotaciones:', anotErr.message)
      return NextResponse.json({ error: anotErr.message }, { status: 500 })
    }

    // 3) si vienen salidas: 1 fila por salida (anclada a la PRIMERA anotación insertada)
    let insertedSalidasCount = 0

    if (Array.isArray(salidas) && salidas.length > 0) {
      const anchor = insertedAnot?.[0]
      if (!anchor) {
        return NextResponse.json(
          { error: 'No se pudo resolver una anotación para anclar las salidas.' },
          { status: 500 },
        )
      }

      const rows = salidas
        .map((s) => {
          const tipoRecibido = (s.tipo || '').toString().trim().toLowerCase()
          const tipoValido = (TIPOS_SALIDA_PERMITIDOS as readonly string[]).includes(tipoRecibido)
            ? tipoRecibido
            : 'trabajo'

          const n = Math.max(0, parseInt(String(s.num_intervienen ?? '0'), 10) || 0)
          if (n <= 0) return null // << descartar

          return {
            anotacion_id: anchor.id,
            tipo: tipoValido,
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

      if (rows.length > 0) {
        const { error: salErr } = await supabase.from('salidas').insert(rows)
        if (salErr) {
          console.error('Error al insertar salidas:', salErr.message)
          return NextResponse.json({ error: salErr.message }, { status: 500 })
        }
        insertedSalidasCount = rows.length
      }
    }

    return NextResponse.json(
      {
        ok: true,
        inserted_anotaciones: insertedAnot?.length ?? 0,
        inserted_salidas: insertedSalidasCount,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('Error inesperado:', err)
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor.' },
      { status: 500 },
    )
  }
}
