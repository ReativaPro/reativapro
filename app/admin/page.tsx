"use client"

import { useEffect, useState } from "react"

type AdminOverview = {
  ok: boolean
  totalUsers: number
  totalSubs: number
  activeSubs: number
  totalConversations: number
}

export default function AdminHomePage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/overview")
        const json = (await res.json()) as AdminOverview

        if (!json.ok) {
          setErrorMsg("Erro ao carregar dados do admin.")
          return
        }

        setData(json)
      } catch (err) {
        console.error("Erro ao buscar overview admin:", err)
        setErrorMsg("Erro inesperado ao carregar painel admin.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold mb-1">
          Visão geral do ReativaPro
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          Aqui você enxerga a saúde do seu SaaS: quantos usuários, quantas
          assinaturas e quantas conversas já foram analisadas pelo sistema.
          Esta é a v1 do painel admin — depois vamos amarrar isso com RLS e
          permissões reais de administrador.
        </p>
      </section>

      {loading && (
        <p className="text-xs text-slate-400">Carregando dados…</p>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-400">Erro: {errorMsg}</p>
      )}

      {data && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
            <p className="text-[11px] text-slate-400 mb-1">Usuários</p>
            <p className="text-2xl font-semibold">{data.totalUsers}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Registrados na tabela users.
            </p>
          </div>

          <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
            <p className="text-[11px] text-slate-400 mb-1">
              Assinaturas ativas
            </p>
            <p className="text-2xl font-semibold">{data.activeSubs}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Do total de {data.totalSubs} assinaturas.
            </p>
          </div>

          <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
            <p className="text-[11px] text-slate-400 mb-1">
              Total de assinaturas
            </p>
            <p className="text-2xl font-semibold">{data.totalSubs}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Inclui ativas, expiradas e pendentes.
            </p>
          </div>

          <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
            <p className="text-[11px] text-slate-400 mb-1">
              Conversas analisadas
            </p>
            <p className="text-2xl font-semibold">
              {data.totalConversations}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Total registrado em whatsapp_conversations.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}