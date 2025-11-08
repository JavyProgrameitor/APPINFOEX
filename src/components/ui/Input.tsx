import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border px-3 py-1 font-semibold text-base md:text-xl shadow-xs outline-none transition-colors',
        // base colors via CSS vars
        'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] placeholder:[color:var(--muted-foreground)]',
        // hover/focus
        'hover:border-[color-mix(in_oklab,var(--border),black_10%)]',
        'focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]',
        // disabled / invalid
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
