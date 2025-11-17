import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Rol = 'admin' | 'bf' | 'jr'
type Body = {
  email: string
  password: string // requerido
  rol: Rol
  dni?: string
  nombre?: string
  apellidos?: string
  unidad_id?: string // NUEVO
  caseta_id?: string // NUEVO
}

// Cliente “admin” (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Helper para limpiar strings vacíos
const clean = (v?: string) => (v && v.trim().length ? v.trim() : null)

export async function POST(req: Request) {
  try {
    // 1) Auth del llamador vía Authorization header (sin cookies)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Falta Authorization Bearer' }, { status: 401 })
    }
    const bearer = authHeader // "Bearer <token>"

    // Cliente “como usuario”
    const supaUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: bearer } } },
    )

    const {
      data: { user },
      error: userErr,
    } = await supaUser.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2) Comprobar rol admin del llamador
    const { data: rec, error: roleErr } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (roleErr || !rec || rec.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 3) Parse + validaciones
    const body = (await req.json()) as Body
    const { email, password, rol, unidad_id, caseta_id } = body
    const dni = clean(body.dni)
    const nombre = clean(body.nombre) ?? ''
    const apellidos = clean(body.apellidos) ?? ''
    const safeEmail = email?.trim().toLowerCase()

    if (!safeEmail || !password || !rol) {
      return NextResponse.json({ error: 'Faltan campos (email, password, rol)' }, { status: 400 })
    }

    if (!email || !password || !rol) {
      return NextResponse.json({ error: 'Faltan campos (email, password, rol)' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 },
      )
    }
    if (!['admin', 'bf', 'jr'].includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Debe venir exactamente una asignación
    if ((!!unidad_id && !!caseta_id) || (!unidad_id && !caseta_id)) {
      return NextResponse.json(
        { error: 'Debes indicar exactamente una: unidad_id o caseta_id' },
        { status: 400 },
      )
    }

    // 4) Crear usuario en auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: safeEmail,
      password,
      email_confirm: true,
      app_metadata: { role: rol },
      user_metadata: {
        rol,
        dni,
        nombre,
        apellidos,
        unidad_id: unidad_id ?? null,
        caseta_id: caseta_id ?? null,
      },
    })
    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: createErr?.message || 'No se pudo crear el usuario (auth)' },
        { status: 400 },
      )
    }

    const auth_user_id = created.user.id

    // 5) Upsert en public.usuarios con unidad/caseta
    const { error: upsertErr } = await supabaseAdmin.from('usuarios').upsert(
      {
        auth_user_id,
        email: safeEmail,
        rol,
        dni,
        nombre,
        apellidos,
        unidad_id: unidad_id ?? null,
        caseta_id: caseta_id ?? null,
      },
      { onConflict: 'auth_user_id' },
    )

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, auth_user_id }, { status: 200 })
  } catch (e: unknown) {
    console.error('❌ Error inesperado:', e)
    return NextResponse.json({ error: 'Error inesperado en servidor.' }, { status: 500 })
  }
}
