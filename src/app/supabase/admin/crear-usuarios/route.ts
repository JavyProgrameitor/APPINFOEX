import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Rol = 'admin' | 'bf' | 'jr'

type Body = {
  email: string
  password: string
  rol: Rol
  dni?: string
  nombre?: string
  apellidos?: string

  // Desde el front mandas el "puesto" en este campo (nombre de unidad o caseta)
  unidad_nombre?: string

  // Por si en algún momento quieres mandar directamente el id de caseta
  caseta_id?: string
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const clean = (v?: string) => (v && v.trim().length ? v.trim() : null)

export async function POST(req: Request) {
  try {
    // -------------------------------
    // 1) Leer body y validar básicos
    // -------------------------------
    const body = (await req.json()) as Body

    const safeEmail = body.email?.trim().toLowerCase()
    const password = body.password
    const rol = body.rol
    const dni = clean(body.dni)
    const nombre = clean(body.nombre) ?? ''
    const apellidos = clean(body.apellidos) ?? ''

    // "unidad_nombre" es el nombre del puesto (unidad o caseta)
    const puestoNombre = clean(body.unidad_nombre)
    const caseta_id_directa = clean(body.caseta_id)

    if (!safeEmail || !password || !rol) {
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

    /*
    // Debe venir al menos un dato de puesto
    if (!puestoNombre && !caseta_id_directa) {
      return NextResponse.json(
        {
          error:
            'Debes indicar el nombre de la unidad o caseta (unidad_nombre) o un caseta_id válido.',
        },
        { status: 400 },
      )
    }
*/
    // ----------------------------------------------------
    // 2) Resolver puestoNombre → unidad_id o caseta_id
    // ----------------------------------------------------
    let unidad_id: string | null = null
    let caseta_id: string | null = caseta_id_directa ?? null

    if (puestoNombre) {
      // Primero buscamos en unidades
      const { data: unidad, error: unidadErr } = await supabaseAdmin
        .from('unidades')
        .select('id')
        .eq('nombre', puestoNombre)
        .maybeSingle()

      if (unidadErr) {
        return NextResponse.json(
          {
            error: `Error buscando la unidad "${puestoNombre}": ${unidadErr.message}`,
          },
          { status: 400 },
        )
      }

      if (unidad) {
        unidad_id = unidad.id
      } else {
        // Si no es una unidad, probamos casetas
        const { data: caseta, error: casetaErr } = await supabaseAdmin
          .from('casetas')
          .select('id')
          .eq('nombre', puestoNombre)
          .maybeSingle()

        if (casetaErr) {
          return NextResponse.json(
            {
              error: `Error buscando la caseta "${puestoNombre}": ${casetaErr.message}`,
            },
            { status: 400 },
          )
        }

        if (caseta) {
          caseta_id = caseta.id
        } else {
          return NextResponse.json(
            {
              error: `No existe ninguna unidad ni caseta con el nombre "${puestoNombre}".`,
            },
            { status: 400 },
          )
        }
      }
    }

    // ----------------------------------------------------
    // 3) Validación final: exactamente una asignación
    // ----------------------------------------------------
    const asignaciones = (unidad_id ? 1 : 0) + (caseta_id ? 1 : 0)
    /*
    if (asignaciones !== 1) {
      return NextResponse.json(
        {
          error:
            'Debes indicar exactamente un puesto válido: nombre de unidad o caseta (unidad_nombre), o un caseta_id, pero no más de uno.',
        },
        { status: 400 },
      )
    }
*/
    // -------------------------------
    // 4) Crear usuario en auth.users
    // -------------------------------
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

    // -------------------------------
    // 5) Insertar en public.usuarios
    // -------------------------------
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
  } catch (e: any) {
    console.error('❌ Error inesperado:', e)
    return NextResponse.json({ error: 'Error inesperado en servidor.' }, { status: 500 })
  }
}
