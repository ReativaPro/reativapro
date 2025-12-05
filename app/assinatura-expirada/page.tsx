"use client"

export default function AssinaturaExpiradaPage() {
  const checkoutUrl = "https://pay.herospark.com/reativapro-acesso-ao-sistema-485349"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl bg-slate-900/80 p-6 space-y-4 text-center">
        <h1 className="text-xl font-semibold text-slate-50">
          Assinatura expirada
        </h1>

        <p className="text-sm text-slate-400">
          Seu acesso ao ReativaPro expirou. Para continuar utilizando o sistema,
          é necessário renovar sua assinatura.
        </p>

        <div className="pt-4">
          <a
            href={checkoutUrl}
            className="inline-flex items-center justify-center w-full bg-emerald-500 text-slate-950 rounded-md py-2 text-sm font-semibold hover:bg-emerald-400"
          >
            Renovar assinatura
          </a>
        </div>

        <p className="text-xs text-slate-500">
          Após o pagamento, seu acesso será liberado automaticamente.
        </p>
      </div>
    </div>
  )
}