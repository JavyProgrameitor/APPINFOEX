// src/app/api/casetas/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/server/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const municipioId = url.searchParams.get('municipio_id')
  const supabase = await createClient()

  if (!municipioId) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('casetas')
    .select('id,nombre,municipio_id')
    .eq('municipio_id', municipioId)
    .order('nombre', { ascending: true })

  if (error) {
    return NextResponse.json([], { status: 200 })
  }

  return NextResponse.json(data ?? [], { status: 200 })
}
