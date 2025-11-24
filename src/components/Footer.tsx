'use client'

import { Flame } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-8">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex items-center justify-center gap-2">
          <Flame color="#F52121" className="bg-amber-300 rounded-full" />
          <p className="text-sm font-black">
            Incendios Forestales de Extremadura
            <b className="text-animate"> © {new Date().getFullYear()} </b>
          </p>
        </div>
      </div>
    </footer>
  )
}
