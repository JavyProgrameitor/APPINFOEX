// src/lib/supabase/server.ts
// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServer() {
  const store = await cookies(); // ← ahora sí, await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          store.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          store.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}
