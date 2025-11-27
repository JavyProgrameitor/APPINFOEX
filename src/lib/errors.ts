// src/lib/errors.ts
export type ErrorDomain = 'auth' | 'api' | 'form' | 'unknown'

function normalizeErrorMessage(error: unknown): string {
  if (!error) return 'Ha ocurrido un error inesperado.'

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  // Último recurso
  try {
    return JSON.stringify(error)
  } catch {
    return 'Ha ocurrido un error inesperado.'
  }
}

// Traducción específica según dominio o mensaje crudo
export function getAppErrorMessage(error: unknown, domain: ErrorDomain = 'unknown'): string {
  const raw = normalizeErrorMessage(error)

  //  Errores de autenticación (Supabase, etc.)
  if (domain === 'auth') {
    if (raw.includes('Invalid login credentials')) {
      return 'Credenciales de acceso inválidas.'
    }
    if (raw.includes('Email not confirmed')) {
      return 'Tu correo todavía no ha sido confirmado.'
    }
    // …añade aquí todo lo que veas que devuelve Supabase u otro backend
    return 'No se ha podido iniciar sesión. Revisa tus datos.'
  }

  // Errores de API genéricos
  if (domain === 'api') {
    if (raw.includes('Failed to fetch')) {
      return 'No se ha podido conectar con el servidor. Revisa tu conexión a internet.'
    }
    return 'Se ha producido un error al comunicarse con el servidor.'
  }

  //  Errores de formulario / validación, si quieres tratarlos distinto
  if (domain === 'form') {
    if (raw.includes('A user with this email address has already been registered')) {
      return 'Ya existe un usuario con esta email registrado.'
    }
    if (raw.includes('duplicate key value violates unique constraint "users_dni_key')) {
      return 'Ya existe un usuario con esta dni.'
    }
    return 'Hay errores en el formulario. Revisa los campos.'
  }

  // Fallback genérico
  return 'Ha ocurrido un error inesperado.'
}
