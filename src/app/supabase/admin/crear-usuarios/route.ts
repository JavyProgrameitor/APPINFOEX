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

  // Formulario individual: manda IDs
  unidad_id?: string | null
  caseta_id?: string | null

  // Importación masiva: manda el nombre del puesto (unidad o caseta)
  unidad_nombre?: string | null
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const clean = (v?: string | null) => (v && v.trim().length ? v.trim() : null)

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

    // IDs que pueden venir del formulario
    let unidad_id: string | null = clean(body.unidad_id ?? null)
    let caseta_id: string | null = clean(body.caseta_id ?? null)

    // Nombre del puesto que puede venir en la importación masiva
    const puestoNombre = clean(body.unidad_nombre ?? null)

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

    // ----------------------------------------------------
    // 2) Resolver puestoNombre -> unidad_id / caseta_id
    //    Solo si NO han venido IDs directos
    // ----------------------------------------------------
    if (!unidad_id && !caseta_id && puestoNombre) {
      // 2.1) Primero buscamos en unidades
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
        // 2.2) Si no existe como unidad, probamos como caseta
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
    // 3) Reglas de negocio (unidad/caseta vs rol)
    // ----------------------------------------------------

    // 1) Los jefes de retén solo en unidades, nunca en casetas
    if (rol === 'jr') {
      if (!unidad_id) {
        return NextResponse.json(
          { error: 'Los jefes de retén deben estar asignados a una unidad.' },
          { status: 400 },
        )
      }

      if (caseta_id) {
        return NextResponse.json(
          { error: 'Los jefes de retén no pueden estar asignados a una caseta.' },
          { status: 400 },
        )
      }
    }

    // 2) En casetas solo puede haber Bomberos Forestales
    if (caseta_id && rol !== 'bf') {
      return NextResponse.json(
        { error: 'Solo los Bomberos Forestales pueden asignarse a una caseta.' },
        { status: 400 },
      )
    }

    // 3) Para bf y jr exigimos alguna asignación
    if ((rol === 'bf' || rol === 'jr') && !unidad_id && !caseta_id) {
      return NextResponse.json(
        { error: 'Debes asignar el usuario a una unidad o una caseta.' },
        { status: 400 },
      )
    }

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
