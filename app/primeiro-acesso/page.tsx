"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PrimeiroAcessoPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email || !password) {
      setError("Preencha e-mail e senha.")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    try {
      setLoading(true)

      const res = await fetch("/api/primeiro-acesso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        switch (data.error) {
          case "user_not_found":
            setError(
              "Não encontramos um cadastro com esse e-mail. Use o mesmo e-mail da compra."
            )
            break
          case "no_active_subscription":
            setError(
              "Não encontramos uma assinatura ativa para este e-mail. Verifique o pagamento."
            )
            break
          case "weak_password":
            setError("A senha é muito fraca. Use pelo menos 6 caracteres.")
            break
          case "auth_create_failed":
            setError(
              "Não foi possível criar seu acesso agora. Tente novamente em alguns minutos."
            )
            break
          default:
            setError("Ocorreu um erro inesperado. Tente novamente.")
        }
        return
      }

      setSuccess(true)

      // Depois de sucesso, manda pro login (que vamos criar na próxima camada)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
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
        <h1 className="text-2xl font-semibold text-white mb-2">
          Primeiro acesso
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Use o mesmo e-mail da compra para criar sua senha e acessar o painel
          da ReativaPro.
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
            <label className="block text-sm text-slate-300 mb-1">
              Nome (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como você quer ser chamado no painel"
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
            <p className="text-xs text-slate-500 mt-1">
              Mínimo de 6 caracteres.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-700 rounded-md px-3 py-2">
              Conta criada com sucesso! Redirecionando para o login...
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 mt-2 transition"
          >
            {loading ? "Criando acesso..." : "Criar meu acesso"}
          </button>
        </form>
      </div>
    </div>
  )
}
