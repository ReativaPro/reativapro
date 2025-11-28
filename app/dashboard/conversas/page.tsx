"use client"

import { useState, useEffect } from "react"

type Conversation = {
  id: string
  file_name?: string | null
  title?: string | null
  summary?: string | null
  intent_level?: string | null
  color?: string | null
  created_at?: string | null
}

type AnalisarResponse = {
  ok: boolean
  summary: string
  intentLevel?: string
  color?: string
  suggestedMessage: string
}

export default function ConversasPage() {
  const [file, setFile] = useState<File | null>(null)
  const [meuNome, setMeuNome] = useState("Você")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<AnalisarResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [historico, setHistorico] = useState<Conversation[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Carregar histórico
  useEffect(() => {
    async function loadHistorico() {
      try {
        setLoadingHistorico(true)
        const res = await fetch("/api/dashboard/conversas/list")
        const data = await res.json()
        if (data.ok) setHistorico(data.conversations ?? [])
      } catch (err) {
        console.error("Erro ao carregar histórico:", err)
      } finally {
        setLoadingHistorico(false)
      }
    }

    loadHistorico()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setResultado(null)

    if (!file) return setErro("Selecione um arquivo .txt.")
    if (!meuNome.trim()) return setErro("Informe como seu nome aparece.")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("meuNome", meuNome.trim())

    try {
      setLoading(true)

      const res = await fetch("/api/conversas/analisar", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErro("Erro ao analisar conversa. Tente novamente.")
        return
      }

      setResultado(data)

      // recarregar histórico
      const hist = await fetch("/api/dashboard/conversas/list")
      const histJson = await hist.json()
      if (histJson.ok) setHistorico(histJson.conversations ?? [])

    } catch (err) {
      console.error("Erro geral no envio:", err)
      setErro("Erro inesperado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <h2 className="text-2xl font-semibold mb-2">
          Análise de conversas (WhatsApp)
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Exporte a conversa do WhatsApp <span className="font-semibold">sem mídia</span>,
          salve como <code>.txt</code> e envie aqui.
        </p>

        <form
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-4 border border-slate-800 rounded-2xl p-4 bg-slate-900/40"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Arquivo da conversa (.txt)
            </label>
            <input
              type="file"
              name="file"
              accept=".txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs file:text-xs file:px-3 file:py-1.5 file:rounded-md 
                file:border-0 file:bg-emerald-500 file:text-slate-950 file:font-semibold 
                border border-slate-700 rounded-md bg-slate-950/70 px-2 py-1.5 text-slate-300"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Como seu nome aparece na conversa?
            </label>
            <input
              type="text"
              name="meuNome"
              value={meuNome}
              onChange={(e) => setMeuNome(e.target.value)}
              className="w-full rounded-md bg-slate-950/70 border border-slate-700 
                px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          {erro && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-md px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-950 rounded-md py-2 text-xs font-semibold 
              hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Analisando..." : "Enviar e analisar"}
          </button>
        </form>

        {/* Resultado */}
        {resultado && (
          <div className="mt-6 border border-slate-800 rounded-2xl p-4 bg-slate-900/60 space-y-3">
            <h3 className="text-sm font-semibold">Resultado da análise</h3>
            <p className="text-xs text-slate-300"><b>Resumo:</b> {resultado.summary}</p>
            <p className="text-xs text-slate-300"><b>Intenção:</b> {resultado.intentLevel}</p>
            <p className="text-xs text-slate-300"><b>Cor:</b> {resultado.color?.toUpperCase()}</p>
            <p className="text-xs text-slate-300 whitespace-pre-line">
              <b>Mensagem sugerida:</b>{" "}
              {resultado.suggestedMessage}
            </p>
          </div>
        )}
      </section>

      {/* Histórico */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Histórico de conversas analisadas</h3>

        {historico.length === 0 && (
          <p className="text-xs text-slate-500">Nenhuma conversa analisada ainda.</p>
        )}

        {historico.length > 0 && (
          <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Conversa</th>
                  <th className="px-3 py-2 text-left">Intenção</th>
                  <th className="px-3 py-2 text-left">Cor</th>
                  <th className="px-3 py-2 text-left">Resumo</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((conv) => {
                  const d = conv.created_at ? new Date(conv.created_at) : null
                  const dataFormatada = d
                    ? d.toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"
                  return (
                    <tr key={conv.id} className="border-t border-slate-800/70 hover:bg-slate-900/80">
                      <td className="px-3 py-2">{dataFormatada}</td>
                      <td className="px-3 py-2">{conv.title || conv.file_name}</td>
                      <td className="px-3 py-2">{conv.intent_level || "—"}</td>
                      <td className="px-3 py-2">{conv.color?.toUpperCase() || "—"}</td>
                      <td className="px-3 py-2 truncate max-w-xs">{conv.summary}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}