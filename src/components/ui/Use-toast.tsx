'use client'

import * as React from 'react'
import * as RT from '@radix-ui/react-toast'
import { X } from 'lucide-react'

type ToastVariant = 'default' | 'destructive'

type ToastInput = {
  title?: string
  description?: string
  duration?: number // ms
  variant?: ToastVariant
}

type ToastItem = ToastInput & { id: string; open: boolean }

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((t: ToastInput) => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, open: true, ...t }])
  }, [])

  const close = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, open: false } : i)))
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      <RT.Provider swipeDirection="right">
        {children}

        {items.map((t) => (
          <RT.Root
            key={t.id}
            open={t.open}
            onOpenChange={(o) => (o ? null : remove(t.id))}
            duration={t.duration ?? 4000}
            className={[
              'pointer-events-auto w-[360px] rounded-2xl border shadow-lg p-3 mb-3 bg-background/95 backdrop-blur',
              t.variant === 'destructive' ? 'border-red-500/40' : 'border-border',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {t.title && <RT.Title className="font-semibold leading-none">{t.title}</RT.Title>}
                {t.description && (
                  <RT.Description className="mt-1 text-sm text-muted-foreground">
                    {t.description}
                  </RT.Description>
                )}
              </div>
              <RT.Close
                aria-label="Cerrar"
                className="opacity-70 hover:opacity-100 transition"
                onClick={() => close(t.id)}
              >
                <X className="h-4 w-4" />
              </RT.Close>
            </div>
          </RT.Root>
        ))}

        <RT.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[100vw] flex-col outline-none" />
      </RT.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToasterProvider />')
  return ctx
}
