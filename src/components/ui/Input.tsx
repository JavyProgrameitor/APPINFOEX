import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'rounded-sm border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer shadow-accent h-full p-2 m-1 ',
        // base colors via CSS vars
        'bg-(--card) text-foreground border-(--border) placeholder:text-muted-foreground',
        // hover/focus
        'hover:border-[color-mix(in_oklab,var(--border),black_10%)]',
        'focus:border-ring focus:ring-2 focus:ring-ring',
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
