// src/lib/supabase/browser.ts
import { createBrowserClient, type CookieOptions } from "@supabase/ssr";

// Helpers mínimos para (de)serializar cookies en el browser
function serialize(name: string, value: string, options: CookieOptions = {}) {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options.maxAge) str += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  str += `; Path=${options.path ?? "/"}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  if (options.secure) str += `; Secure`;
  if (options.httpOnly) {
    // En el navegador no podemos crear httpOnly; lo ignoramos.
  }
  return str;
}
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : undefined;
}

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name) {
        return getCookie(name);
      },
      set(name, value, options) {
        document.cookie = serialize(name, value, {
          sameSite: "lax",
          path: "/",
          ...options,
        });
      },
      remove(name, options) {
        document.cookie = serialize(name, "", {
          sameSite: "lax",
          path: "/",
          expires: new Date(0),
          ...options,
        });
      },
    },
  }
);
