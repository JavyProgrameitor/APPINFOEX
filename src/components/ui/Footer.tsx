"use client";

export default function Footer() {
  return (
    <footer className="border-t-6 border-white/90 bg-[--card]-95 backdrop-blur-sm text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-6 py-4 text-center flex flex-col sm:flex-row items-center justify-center gap-2">
        <span className="text-foreground font-semibold tracking-wide">INFOEX</span>
        <span className="hidden sm:inline">–</span>
        <span className="text-foreground/80">
          Incendios Forestales de Extremadura © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
