"use client"

import { useState } from "react"

export default function ConfiguracoesPage() {
  const [email, setEmail] = useState("")
  const [meuNome, setMeuNome] = useState("Você")
  const [tone, setTone] = useState("neutro")
  const [defaultColor, setDefaultColor] = useState("green")

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setErro(null)
    setMensagem(null)

    if (!email.trim()) {
      setErro("Informe o e-mail da conta para carregar as configurações.")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/configuracoes/get?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErro(data.error || "Não foi possível carregar as configurações.")
        return
      }

      if (!data.settings) {
        setMensagem("Nenhuma configuração encontrada. Você pode salvar novas agora.")
        setMeuNome("Você")
        setTone("neutro")
        setDefaultColor("green")
        return
      }

      setMeuNome(data.settings.meu_nome || "Você")
      setTone(data.settings.tone || "neutro")
      setDefaultColor(data.settings.default_color || "green")
      setMensagem("Configurações carregadas com sucesso.")
    } catch (err) {
      console.error("[CONFIG PAGE] Erro ao carregar:", err)
      setErro("Erro inesperado ao carregar as configurações.")
    } finally {
      setLoading(false)
    }
  }

  async function salvar() {
    setErro(null)
    setMensagem(null)

    if (!email.trim()) {
      setErro("Informe o e-mail da conta para salvar as configurações.")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/dashboard/configuracoes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          meu_nome: meuNome,
          tone,
          default_color: defaultColor,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErro(data.error || "Não foi possível salvar as configurações.")
        return
      }

      setMensagem("Configurações salvas com sucesso.")
    } catch (err) {
      console.error("[CONFIG PAGE] Erro ao salvar:", err)
      setErro("Erro inesperado ao salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Configurações da conta</h2>
        <p className="text-sm text-slate-400">
          Ajuste como o ReativaPro entende suas conversas e como a IA deve se comportar ao gerar mensagens.
        </p>
      </header>

      {/* E-mail da conta */}
      <div className="space-y-2">
        <label className="text-sm text-slate-200 font-medium">
          E-mail da conta
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-md bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          placeholder="seu-email@exemplo.com"
        />
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-700 text-slate-100 hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? "Carregando..." : "Carregar configurações"}
        </button>
      </div>

      <hr className="border-slate-800" />

      {/* Nome na conversa */}
      <div className="space-y-2">
        <label className="text-sm text-slate-200 font-medium">
          Como seu nome aparece nas conversas?
        </label>
        <input
          type="text"
          value={meuNome}
          onChange={e => setMeuNome(e.target.value)}
          className="w-full rounded-md bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          placeholder="Ex: Rapha"
        />
      </div>

      {/* Tom da IA */}
      <div className="space-y-2">
        <label className="text-sm text-slate-200 font-medium">
          Tom da IA nas mensagens de recuperação
        </label>
        <select
          value={tone}
          onChange={e => setTone(e.target.value)}
          className="w-full rounded-md bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="neutro">Neutro</option>
          <option value="amigavel">Amigável</option>
          <option value="vendedor">Mais vendedor</option>
          <option value="profissional">Profissional / formal</option>
        </select>
      </div>

      {/* Cor padrão */}
      <div className="space-y-2">
        <label className="text-sm text-slate-200 font-medium">
          Cor padrão se a IA não identificar a intenção
        </label>
        <select
          value={defaultColor}
          onChange={e => setDefaultColor(e.target.value)}
          className="w-full rounded-md bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="green">Verde (quente)</option>
          <option value="yellow">Amarelo (morno)</option>
          <option value="red">Vermelho (frio)</option>
          <option value="gray">Cinza (indefinido)</option>
        </select>
      </div>

      {erro && (
        <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-md px-3 py-2">
          {erro}
        </p>
      )}

      {mensagem && (
        <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
          {mensagem}
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={saving}
        className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  )
}