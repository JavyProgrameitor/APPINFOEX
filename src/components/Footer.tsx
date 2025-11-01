"use client";

export default function Footer() {
  return (
    <footer className="border-t-10 border-white-90">
      <div className="mx-auto max-w-7xl px-6 py-6 text-center flex flex-col sm:flex-row items-center justify-center gap-2">
        <span className="text-2xl font-black">INFOEX</span>
        <span>
          Incendios Forestales de Extremadura © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
