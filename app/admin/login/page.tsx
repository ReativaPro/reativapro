"use client"

import { useState } from "react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMensagem(null)

    if (!email.trim() || !password.trim()) {
      setErro("Preencha e-mail e senha.")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErro(data.error || "Falha no login.")
        return
      }

      setMensagem("Login realizado com sucesso. Redirecionando...")

      setTimeout(() => {
        window.location.href = "/admin"
      }, 1000)
    } catch (err) {
      console.error("[ADMIN LOGIN PAGE] Erro:", err)
      setErro("Erro inesperado ao tentar fazer login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm border border-slate-800 rounded-2xl bg-slate-900/70 p-6 space-y-4">
        <h1 className="text-lg font-semibold text-slate-50">
          Login do Admin — ReativaPro
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <label className="text-slate-200 text-xs font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-200 text-xs font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md bg-slate-950/80 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>

          {erro && (
            <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900 rounded-md px-3 py-2">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-950 rounded-md py-2 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar como admin"}
          </button>
        </form>
      </div>
    </div>
  )
}