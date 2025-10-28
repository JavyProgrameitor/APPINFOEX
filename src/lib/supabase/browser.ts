"use client";

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
// Si tienes tus tipos generados de Supabase, descomenta y usa así:
// import type { Database } from "@/lib/supabase/types";

function serialize(name: string, value: string, options: CookieOptions = {}) {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options.maxAge) str += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  str += `; Path=${options.path ?? "/"}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  if (options.secure) str += `; Secure`;
  return str;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : undefined;
}

/**
 * Crea un cliente de Supabase para usar en el navegador.
 * Se invoca como función: supabaseBrowser()
 */
export const supabaseBrowser = () =>
  // Si tienes tipos: createBrowserClient<Database>(...)
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return getCookie(name);
        },
        set(name, value, options) {
          if (typeof document === "undefined") return;
          document.cookie = serialize(name, value, options);
        },
        remove(name, options) {
          if (typeof document === "undefined") return;
          document.cookie = serialize(name, "", {
            ...options,
            expires: new Date(0),
          });
        },
      },
    }
  );
