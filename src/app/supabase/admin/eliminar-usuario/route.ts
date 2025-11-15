import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Rol = 'admin' | 'bf' | 'jr'

type Body = {
  usuario_id: string
}

// Cliente “admin” (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  try {
    // 1) Auth del llamador vía Authorization header (sin cookies)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Falta Authorization Bearer' }, { status: 401 })
    }
    const bearer = authHeader // "Bearer <token>"

    // Cliente “como usuario” (para saber quién llama)
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
      .select('id, rol')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (roleErr || !rec || rec.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 3) Parse body
    const body = (await req.json()) as Body
    const usuario_id = body?.usuario_id?.trim()

    if (!usuario_id) {
      return NextResponse.json({ error: 'Falta usuario_id' }, { status: 400 })
    }

    // 4) Buscar usuario a eliminar
    const { data: usuario, error: usuarioErr } = await supabaseAdmin
      .from('usuarios')
      .select('id, auth_user_id, dni, nombre, apellidos, rol')
      .eq('id', usuario_id)
      .maybeSingle()

    if (usuarioErr) {
      return NextResponse.json({ error: usuarioErr.message }, { status: 400 })
    }
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Evitar que un admin se elimine a sí mismo
    if (usuario.auth_user_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario desde esta pantalla.' },
        { status: 400 },
      )
    }

    // (Opcional) Evitar borrar otros admins
    if (usuario.rol === 'admin') {
      return NextResponse.json(
        { error: 'No se permite eliminar usuarios con rol administrador desde aquí.' },
        { status: 400 },
      )
    }

    // 5) Eliminar cuenta de autenticación (auth.users)
    if (usuario.auth_user_id) {
      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(usuario.auth_user_id)
      if (delAuthErr) {
        return NextResponse.json(
          { error: delAuthErr.message || 'No se pudo eliminar la cuenta de acceso.' },
          { status: 400 },
        )
      }
    }

    // 6) Eliminar fila de tabla usuarios
    const { error: delRowErr } = await supabaseAdmin.from('usuarios').delete().eq('id', usuario_id)

    if (delRowErr) {
      return NextResponse.json(
        { error: delRowErr.message || 'No se pudo eliminar el registro en usuarios.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        id: usuario.id,
        dni: usuario.dni,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
      },
      { status: 200 },
    )
  } catch (e: unknown) {
    console.error('❌ Error inesperado eliminando usuario:', e)
    return NextResponse.json({ error: 'Error inesperado en servidor.' }, { status: 500 })
  }
}
