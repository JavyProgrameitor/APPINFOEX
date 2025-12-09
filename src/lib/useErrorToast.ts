'use client'

import { useToast } from '@/components/ui/Use-toast'
import { getAppErrorMessage, type ErrorDomain } from '@/lib/errors'

export function useErrorToast(domain: ErrorDomain = 'unknown') {
  const { toast } = useToast()

  return (error: unknown) => {
    const description = getAppErrorMessage(error, domain)

    toast({
      variant: 'destructive', // estilo "error bonito"
      title: 'Ha ocurrido un error',
      description,
    })
  }
}
