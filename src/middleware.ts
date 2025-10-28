import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions as SupaCookieOptions, type CookieMethodsServer } from "@supabase/ssr";

type Rol = "admin" | "bf" | "jr" | "pending";

const ROUTE_ROLE: Record<Exclude<Rol, "pending">, RegExp> = {
  admin: /^\/admin(\/|$)/,
  bf: /^\/bf(\/|$)/,
  jr: /^\/jr(\/|$)/,
};

const HOME_BY_ROLE: Record<Exclude<Rol, "pending">, `/${"admin" | "bf" | "jr"}`> = {
  admin: "/admin",
  bf: "/bf",
  jr: "/jr",
};

// Rutas públicas (accesibles sin sesión y también por usuarios pending)
const PUBLIC_ROUTES = [
  /^\/$/,                 // login / home
  /^\/registro(\/|$)/,    // registro
  /^\/pendiente(\/|$)/,   // estado de cuenta pendiente
  /^\/_next(\/|$)/,
  /^\/public(\/|$)/,
  /^\/favicon\.ico$/,
];

// Estructuras que espera @supabase/ssr 0.7 para setAll / getAll
type GetCookie = { name: string; value: string };
type SetCookie = { name: string; value: string; options?: SupaCookieOptions };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // ✅ Adapter para CookieMethodsServer (SOLO getAll y setAll en v0.7.0)
  const cookiesAdapter: CookieMethodsServer = {
    getAll(): GetCookie[] {
      const items =
        (req as unknown as { cookies: { getAll: () => { name: string; value: string }[] } }).cookies.getAll();
      return items.map(({ name, value }) => ({ name, value }));
    },
    setAll(cookiesToSet: SetCookie[]) {
      for (const { name, value, options } of cookiesToSet) {
        res.cookies.set({ name, value, ...(options ?? {}) });
      }
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter }
  );

  const isPublic = PUBLIC_ROUTES.some((r) => r.test(pathname));

  // —————————————————————————————————————————————
  // 1) Si la ruta es pública, dejamos pasar… pero
  //    si hay sesión y está en "/", lo enviamos a su home (o /pendiente).
  // —————————————————————————————————————————————
  if (isPublic) {
    const { data: { user } = {} } = await supabase.auth.getUser();

    if (!user) return res;

    // Obtener rol desde public.users; si no existe fila, tratamos como pending
    const { data: rec } = await supabase
      .from("users")
      .select("rol")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const rol = (rec?.rol ?? "pending") as Rol;

    // Desde "/" redirigimos a home por rol, o a /pendiente si pending
    if (pathname === "/") {
      if (rol === "pending") return NextResponse.redirect(new URL("/pendiente", req.url));
      return NextResponse.redirect(new URL(HOME_BY_ROLE[rol], req.url));
    }

    // Si es pending y navega a /registro (o a la propia /pendiente), permitimos
    return res;
  }

  // —————————————————————————————————————————————
  // 2) Rutas NO públicas: requieren sesión
  // —————————————————————————————————————————————
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3) Cargar rol (si no hay fila, pending por defecto)
  const { data: rec, error } = await supabase
    .from("users")
    .select("rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    // Si hay error de lectura del perfil, vuelve al login
    return NextResponse.redirect(new URL("/", req.url));
  }

  const rol = (rec?.rol ?? "pending") as Rol;

  // 4) Usuarios pending: sólo pueden entrar a /pendiente (aunque no esté en PUBLIC_ROUTES)
  if (rol === "pending") {
    if (/^\/pendiente(\/|$)/.test(pathname)) return res;
    return NextResponse.redirect(new URL("/pendiente", req.url));
  }

  // 5) Si la ruta es de rol (/admin|/jr|/bf), validamos coincidencia rol-ruta
  for (const [r, regex] of Object.entries(ROUTE_ROLE)) {
    if (regex.test(pathname)) {
      
      const home = HOME_BY_ROLE[rol as Exclude<Rol, "pending">];
    
      return r === rol ? res : NextResponse.redirect(new URL(home, req.url));
    }
  }

  // 6) Resto de rutas no públicas (si las hay) pasan para usuarios con rol válido
  return res;
}

// Ampliamos el matcher para que el middleware pueda:
// - Redirigir a /pendiente cuando rol = pending
// - Redirigir desde "/" a la home del rol
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
