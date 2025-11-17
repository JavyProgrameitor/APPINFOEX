import { NextRequest, NextResponse } from 'next/server'
import {
  createServerClient,
  type CookieOptions as SupaCookieOptions,
  type CookieMethodsServer,
} from '@supabase/ssr'

type Rol = 'admin' | 'bf' | 'jr'

const ROUTE_ROLE: Record<Rol, RegExp> = {
  admin: /^\/admin(\/|$)/,
  bf: /^\/bf(\/|$)/,
  jr: /^\/jr(\/|$)/,
}

const HOME_BY_ROLE: Record<Rol, `/${Rol}`> = {
  admin: '/admin',
  bf: '/bf',
  jr: '/jr',
}

type GetCookie = { name: string; value: string }
type SetCookie = { name: string; value: string; options?: SupaCookieOptions }

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/bf') || pathname.startsWith('/jr')
  if (!isProtected) return NextResponse.next()

  const res = NextResponse.next()

  const cookiesAdapter: CookieMethodsServer = {
    getAll(): GetCookie[] {
      const items = (
        req as unknown as {
          cookies: { getAll: () => { name: string; value: string }[] }
        }
      ).cookies.getAll()
      return items.map(({ name, value }) => ({ name, value }))
    },
    setAll(cookiesToSet: SetCookie[]) {
      for (const { name, value, options } of cookiesToSet) {
        res.cookies.set({ name, value, ...(options ?? {}) })
      }
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter },
  )

  // sesión
  const { data: { user } = {} } = await supabase.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // rol
  const { data: rec, error } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error || !rec?.rol) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const rol = String(rec.rol) as Rol

  /*
  // 3) ruta permitida
  if (!ROUTE_ROLE[rol].test(pathname)) {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[rol], req.url))
  }
*/
  // 3) ruta permitida
  if (rol === 'jr') {
    // Los jefes de retén (jr) pueden acceder a /jr y también a /bf
    const allowedForJr = ROUTE_ROLE.jr.test(pathname) || ROUTE_ROLE.bf.test(pathname)
    if (!allowedForJr) {
      return NextResponse.redirect(new URL(HOME_BY_ROLE[rol], req.url))
    }
  } else {
    if (!ROUTE_ROLE[rol].test(pathname)) {
      return NextResponse.redirect(new URL(HOME_BY_ROLE[rol], req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/bf/:path*', '/jr/:path*'],
}
