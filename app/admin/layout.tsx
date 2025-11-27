import Link from "next/link"
import type { ReactNode } from "react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between bg-slate-950/80">
        <div>
          <h1 className="text-lg font-semibold">Painel Admin — ReativaPro</h1>
          <p className="text-xs text-slate-400">
            Visão geral do seu SaaS. (v1 ainda sem restrição real, vamos
            proteger isso quando chegarmos na camada de segurança/RLS.)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/dashboard"
            className="px-3 py-1 rounded-lg border border-slate-700 hover:border-emerald-400 hover:text-emerald-300"
          >
            Voltar para o painel do cliente
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}