// src/app/api/zonas/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_zonas_enum')

  if (error) {
    // si algo falla, devolvemos array vacío
    return NextResponse.json([], { status: 200 })
  }

  // data debería ser text[]
  return NextResponse.json(data ?? [], { status: 200 })
}
