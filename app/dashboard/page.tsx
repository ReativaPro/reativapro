"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type SubscriptionStatus =
  | "no_user"
  | "no_subscription"
  | "active"
  | "expired"
  | "pending"

type AssinaturaResponse = {
  ok: boolean
  foundUser?: boolean
  status?: SubscriptionStatus
  subscription?: {
    plan: string | null
    status: string | null
    expires_at: string | null
    started_at: string | null
    last_payment_status: string | null
  } | null
  error?: string
}

export default function DashboardHomePage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssinaturaResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [totalConversas, setTotalConversas] = useState<number | null>(null)
  const [loadingResumo, setLoadingResumo] = useState(false)

  useEffect(() => {
    async function fetchResumo() {
      try {
        setLoadingResumo(true)
        const res = await fetch("/api/dashboard/resumo")
        const data = await res.json()
        if (data.ok) {
          setTotalConversas(data.totalConversations ?? 0)
        }
      } catch (err) {
        console.error("Erro ao carregar resumo do dashboard:", err)
      } finally {
        setLoadingResumo(false)
      }
    }

    fetchResumo()
  }, [])

  async function handleCheckAssinatura(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setResult(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setErrorMsg("Digite um e-mail para consultar.")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/assinatura/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = (await res.json()) as AssinaturaResponse

      if (!res.ok || !data.ok) {
        setErrorMsg("Erro ao consultar assinatura. Tente novamente.")
        return
      }

      setResult(data)
    } catch (err) {
      console.error("Erro ao consultar assinatura:", err)
      setErrorMsg("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function renderStatus() {
    if (!result) return null

    if (result.status === "no_user") {
      return (
        <p className="text-xs text-rose-400">
          Nenhum usuário foi encontrado com esse e-mail.
        </p>
      )
    }

    if (result.status === "no_subscription") {
      return (
        <p className="text-xs text-amber-300">
          Usuário encontrado, mas nenhuma assinatura registrada ainda.
        </p>
      )
    }

    if (result.status === "pending") {
      return (
        <p className="text-xs text-amber-300">
          Assinatura está em estado{" "}
          <span className="font-semibold">pendente</span>. Aguarde a
          confirmação do pagamento na HeroSpark.
        </p>
      )
    }

    if (result.status === "expired") {
      return (
        <p className="text-xs text-rose-300">
          Assinatura encontrada, mas está{" "}
          <span className="font-semibold">expirada</span>. Peça para o cliente
          renovar o plano na página de pagamento.
        </p>
      )
    }

    if (result.status === "active") {
      const exp = result.subscription?.expires_at
      let expText = ""
      if (exp) {
        const d = new Date(exp)
        expText = d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      }

      return (
        <p className="text-xs text-emerald-300">
          Assinatura <span className="font-semibold">ativa</span>{" "}
          {result.subscription?.plan && (
            <>
              do plano{" "}
              <span className="font-semibold">
                {result.subscription.plan}
              </span>{" "}
            </>
          )}
          {expText && (
            <>
              até <span className="font-semibold">{expText}</span>.
            </>
          )}
        </p>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold mb-2">
          Bem-vindo ao ReativaPro
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          Aqui é o seu painel central. Você pode analisar conversas de WhatsApp,
          entender a intenção de compra dos seus clientes e usar mensagens
          prontas para recuperar vendas que quase foram perdidas.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {/* Card 1 - Análise de conversas */}
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold mb-1">Análise de conversas</h3>
          <p className="text-xs text-slate-400 mb-2">
            Envie conversas exportadas do WhatsApp (.txt) e veja a
            classificação automática de intenção do cliente, cor
            (verde/amarelo/vermelho/cinza) e mensagem sugerida para recuperar o
            lead.
          </p>

          {loadingResumo ? (
            <p className="text-[11px] text-slate-500 mb-2">
              Carregando resumo…
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mb-2">
              {totalConversas === null
                ? "Ainda não foi possível carregar o resumo."
                : totalConversas === 0
                ? "Nenhuma conversa analisada ainda."
                : `Você já analisou ${totalConversas} conversa${
                    totalConversas === 1 ? "" : "s"
                  } até agora.`}
            </p>
          )}

          <Link
            href="/dashboard/conversas"
            className="inline-flex items-center text-xs font-semibold text-emerald-300 hover:text-emerald-200"
          >
            Ir para Análise de conversas →
          </Link>
        </div>

        {/* Card 2 - Status da assinatura (novo) */}
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40 space-y-2">
          <h3 className="text-sm font-semibold mb-1">Status da assinatura</h3>
          <p className="text-xs text-slate-400">
            Enquanto não ligamos isso automaticamente ao usuário logado, você
            pode testar o status de qualquer e-mail cadastrado no sistema.
          </p>

          <form onSubmit={handleCheckAssinatura} className="space-y-2">
            <input
              type="email"
              placeholder="email@cliente.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 py-2 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Consultando..." : "Ver status da assinatura"}
            </button>
          </form>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-1">{errorMsg}</p>
          )}

          {renderStatus()}
        </div>

        {/* Card 3 - Configurações (placeholder) */}
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold mb-1">Configurações</h3>
          <p className="text-xs text-slate-400 mb-3">
            Em breve você poderá ajustar preferências do sistema, dados do seu
            perfil e receber recomendações de melhorias personalizadas.
          </p>
          <Link
            href="/dashboard/configuracoes"
            className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-slate-100"
          >
            Abrir Configurações →
          </Link>
        </div>
      </section>
    </div>
  )
}