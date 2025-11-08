// src/app/api/municipios/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const zona = url.searchParams.get('zona')
  const supabase = await createClient()

  if (!zona) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('municipios')
    .select('id,nombre')
    .eq('zona', zona)
    .order('nombre', { ascending: true })

  if (error) {
    return NextResponse.json([], { status: 200 })
  }

  return NextResponse.json(data ?? [], { status: 200 })
}
