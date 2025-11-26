"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Preencha e-mail e senha.")
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Tratamento de erros comuns
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          setError("E-mail ou senha inválidos.")
        } else {
          console.error("Erro no login:", error)
          setError("Não foi possível entrar. Tente novamente.")
        }
        return
      }

      if (!data.session) {
        setError("Sessão não criada. Tente novamente.")
        return
      }

      // Login OK → manda pro dashboard
      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800">
        <h1 className="text-2xl font-semibold text-white mb-2">Login</h1>
        <p className="text-slate-400 text-sm mb-6">
          Acesse o painel da ReativaPro com o e-mail e senha criados no seu
          primeiro acesso.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Senha</label>
            <input
              type="password"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 mt-2 transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
