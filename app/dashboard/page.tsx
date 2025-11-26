"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Não logado → manda pro login
        router.replace("/login")
        return
      }

      setUserEmail(user.email ?? null)
      setLoading(false)
    }

    loadUser()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Carregando painel...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="w-full border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">ReativaPro — Painel</h1>
        <div className="flex items-center gap-3 text-sm">
          {userEmail && <span className="text-slate-400">{userEmail}</span>}
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">
        <h2 className="text-xl font-semibold mb-2">Bem-vindo ao ReativaPro</h2>
        <p className="text-slate-400 mb-4 text-sm">
          Aqui é onde você vai ver seus clientes, conversas analisadas e
          oportunidades de recuperação. Por enquanto, este é só o esqueleto
          inicial do painel.
        </p>

        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
          <p className="text-sm text-slate-300">
            Próximos módulos que vamos colocar aqui:
          </p>
          <ul className="text-sm text-slate-400 mt-2 list-disc pl-5 space-y-1">
            <li>Lista de leads com cores (verde/amarelo/vermelho/cinza)</li>
            <li>Mensagens prontas para recuperar cada tipo de cliente</li>
            <li>Indicador de quem realmente quis comprar</li>
            <li>Módulo de Análise de Conversas (Camada 8)</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
