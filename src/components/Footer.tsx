'use client'

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <p className="text-center text-sm">
          Incendios Forestales de Extremadura © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
