import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base: fondo transparente + borde blanco
        "h-9 w-full min-w-0 rounded-md border border-white bg-transparent px-3 py-1 text-base text-white " +
          "shadow-xs transition-all duration-200 outline-none " +
          "placeholder:text-gray-400 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium " +
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Hover → cambia el cursor y acentúa el borde
        "hover:border-white/80 hover:cursor-pointer",
        // Focus → fondo blanco, texto oscuro, anillo sutil
        "focus:bg-white focus:text-black focus:border-white focus:ring-2 focus:ring-white/50",
        // Estados de error o inválido
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
