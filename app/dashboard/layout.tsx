import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"

function DashboardNav() {
  const pathname = usePathname()

  const links = [
    { href: "/dashboard", label: "Início" },
    { href: "/dashboard/conversas", label: "Conversas" },
    { href: "/dashboard/configuracoes", label: "Configurações" },
  ]

  return (
    <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/80">
      <div className="px-4 py-4 border-b border-slate-800">
        <span className="text-sm font-semibold text-emerald-400">
          ReativaPro
        </span>
        <p className="text-xs text-slate-500">
          Painel de recuperação de clientes
        </p>
      </div>
      <nav className="px-2 py-3 flex md:flex-col gap-2 overflow-x-auto">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-2 rounded-lg whitespace-nowrap ${
                active
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-300 hover:bg-slate-800/70 border border-transparent"
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <DashboardNav />
      <div className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-950/70">
          <div>
            <h1 className="text-sm font-semibold text-slate-200">
              Painel ReativaPro
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie suas análises e seus clientes em um só lugar.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {/* Placeholder para no futuro mostrar nome do usuário / plano */}
            {/* Ex: {user?.email} | Plano Mensal */}
          </div>
        </header>
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}