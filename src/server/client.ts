'use client'

import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

/** Llama a esto solo en componentes con "use client" */
export function getSupabaseBrowser() {
  if (_client) return _client
  if (typeof window === 'undefined') {
    // Nunca construyas el cliente de browser en SSR
    throw new Error('getSupabaseBrowser() called on the server')
  }
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _client
}
