'use client'

export default function Footer() {
  return (
    <footer className="border-8">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <p className="text-center text-lg font-bold">
          Incendios Forestales de Extremadura
          <b className="text-primary"> © {new Date().getFullYear()} </b>
        </p>
      </div>
    </footer>
  )
}
