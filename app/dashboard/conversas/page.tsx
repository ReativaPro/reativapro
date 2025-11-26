"use client"

import { useState } from "react"

type ConversationResult = {
  id: string
  file_name: string
  summary: string | null
  color: string | null
  intent_level: string | null
  main_objections: string | null
  followup_script: string | null
}

export default function ConversasPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sellerName, setSellerName] = useState("Você")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConversationResult | null>(null)

  // Por enquanto vamos deixar o userId em branco/null.
  // Depois, quando o painel estiver 100% integrado ao Supabase Auth,
  // a gente passa o userId real aqui.
  const userId = ""

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError("Envie um arquivo .txt exportado do WhatsApp.")
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("sellerName", sellerName)
      formData.append("userId", userId)

      const res = await fetch("/api/conversas/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        console.error("Erro na API:", data)
        setError("Não foi possível analisar a conversa. Tente novamente.")
        return
      }

      setResult(data.conversation)
    } catch (err) {
      console.error(err)
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6">
      <h1 className="text-2xl font-semibold mb-2">
        Análise de conversas (WhatsApp)
      </h1>
      <p className="text-sm text-slate-400 mb-6 max-w-2xl">
        Exporte a conversa do WhatsApp <b>sem mídia</b>, escolha a opção de
        salvar como arquivo <b>.txt</b> e envie aqui para o ReativaPro analisar
        o comportamento do cliente, classificar a dificuldade de recuperação e
        sugerir uma mensagem pronta.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-xl border border-slate-800 rounded-2xl p-4 bg-slate-900/40"
      >
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Arquivo da conversa (.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
            }}
            className="block w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-black hover:file:bg-emerald-600"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Como seu nome aparece na conversa?
          </label>
          <input
            type="text"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder='Ex: "Você" ou "Raphael"'
          />
          <p className="text-xs text-slate-500 mt-1">
            Usamos isso para diferenciar o que é mensagem sua e o que é mensagem
            do cliente.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium px-4 py-2 text-sm"
        >
          {loading ? "Analisando..." : "Enviar e analisar"}
        </button>
      </form>

      {result && (
        <div className="mt-8 max-w-2xl border border-slate-800 rounded-2xl p-4 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Resultado da análise — {result.file_name}
            </h2>
            {result.color && (
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  result.color === "green"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : result.color === "yellow"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : result.color === "red"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-slate-600/40 text-slate-300"
                }`}
              >
                {result.color.toUpperCase()}
              </span>
            )}
          </div>

          {result.intent_level && (
            <p className="text-sm text-slate-300">
              <b>Nível de intenção:</b> {result.intent_level}
            </p>
          )}

          {result.summary && (
            <p className="text-sm text-slate-300">
              <b>Resumo:</b> {result.summary}
            </p>
          )}

          {result.main_objections && (
            <p className="text-sm text-slate-300">
              <b>Principais objeções:</b> {result.main_objections}
            </p>
          )}

          {result.followup_script && (
            <div className="mt-3">
              <p className="text-sm text-slate-300 mb-1">
                <b>Mensagem sugerida para recuperar esse cliente:</b>
              </p>
              <pre className="text-sm bg-slate-950/70 border border-slate-800 rounded-md px-3 py-2 whitespace-pre-wrap">
                {result.followup_script}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
