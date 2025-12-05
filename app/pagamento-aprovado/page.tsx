"use client"

export default function PagamentoAprovadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full border border-emerald-900 rounded-2xl bg-emerald-950/40 p-6 space-y-4 text-center">
        <h1 className="text-xl font-semibold text-emerald-400">
          Pagamento aprovado!
        </h1>

        <p className="text-sm text-slate-300">
          Seu pagamento foi confirmado com sucesso. Seu acesso ao ReativaPro já
          foi liberado novamente.
        </p>

        <div className="pt-4">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center w-full bg-emerald-500 text-slate-950 rounded-md py-2 text-sm font-semibold hover:bg-emerald-400"
          >
            Ir para o painel
          </a>
        </div>

        <p className="text-xs text-slate-500">
          Se algo não estiver funcionando corretamente, entre em contato com o suporte.
        </p>
      </div>
    </div>
  )
}