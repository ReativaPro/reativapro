"use client"

import { useEffect, useState } from "react"

type ResumoDashboard = {
  totalConversas: number
  ultimaAnalise?: string | null
}

type AssinaturaInfo = {
  status: string
  plan?: string | null
  expires_at?: string | null
  last_payment_status?: string | null
}

export default function DashboardPage() {
  // --------- estado resumo ----------
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null)
  const [loadingResumo, setLoadingResumo] = useState(false)
  const [erroResumo, setErroResumo] = useState<string | null>(null)

  // --------- estado assinatura ----------
  const [emailConsulta, setEmailConsulta] = useState("email@cliente.com")
  const [assinatura, setAssinatura] = useState<AssinaturaInfo | null>(null)
  const [loadingAssinatura, setLoadingAssinatura] = useState(false)
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null)

  // Carrega resumo ao entrar no dashboard
  useEffect(() => {
    async function carregarResumo() {
      try {
        setLoadingResumo(true)
        setErroResumo(null)

        const res = await fetch("/api/dashboard/resumo")
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setErroResumo("Não foi possível carregar o resumo do painel.")
          return
        }

        const total =
          data.meta?.total_conversas_analisadas ??
          data.meta?.totalConversas ??
          0

        const ultima =
          data.meta?.ultima_analise ??
          data.meta?.ultimaAnalise ??
          null

        setResumo({
          totalConversas: total,
          ultimaAnalise: ultima,
        })
      } catch (err) {
        console.error("[Dashboard] Erro ao carregar resumo:", err)
        setErroResumo("Erro inesperado ao carregar o resumo.")
      } finally {
        setLoadingResumo(false)
      }
    }

    carregarResumo()
  }, [])

  async function handleVerStatusAssinatura() {
    setErroAssinatura(null)
    setAssinatura(null)

    if (!emailConsulta.trim()) {
      setErroAssinatura("Informe um e-mail para consultar.")
      return
    }

    try {
      setLoadingAssinatura(true)

      const res = await fetch("/api/assinatura/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailConsulta.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErroAssinatura(
          data.error || "Não foi possível encontrar essa assinatura."
        )
        return
      }

      const sub = data.subscription ?? data.data ?? null

      if (!sub) {
        setErroAssinatura("Nenhuma assinatura ativa encontrada para esse e-mail.")
        return
      }

      setAssinatura({
        status: sub.status ?? "desconhecido",
        plan: sub.plan ?? sub.product_name ?? null,
        expires_at: sub.expires_at ?? null,
        last_payment_status: sub.last_payment_status ?? null,
      })
    } catch (err) {
      console.error("[Dashboard] Erro ao buscar status assinatura:", err)
      setErroAssinatura("Erro inesperado ao consultar assinatura.")
    } finally {
      setLoadingAssinatura(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Bem-vindo ao ReativaPro
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Aqui é o seu painel central. Analise conversas de WhatsApp, entenda a intenção
          de compra dos seus leads e acompanhe o status das assinaturas em um só lugar.
        </p>
      </header>

      {/* Grid principal */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1 - Análise de conversas */}
        <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                Análise de conversas
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Envie conversas exportadas do WhatsApp em formato{" "}
                <code>.txt</code> para o ReativaPro analisar intenção de compra,
                classificar por cor (verde/amarelo/vermelho/cinza) e sugerir
                mensagens prontas para recuperar vendas.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs space-y-1.5">
            {loadingResumo && (
              <p className="text-slate-400">Carregando resumo…</p>
            )}

            {!loadingResumo && erroResumo && (
              <p className="text-rose-400">{erroResumo}</p>
            )}

            {!loadingResumo && !erroResumo && resumo && (
              <>
                <p className="text-slate-300">