import Link from "next/link"

export default function DashboardHomePage() {
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
        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold mb-1">Análise de conversas</h3>
          <p className="text-xs text-slate-400 mb-3">
            Envie conversas exportadas do WhatsApp (.txt) e veja a classificação
            automática de intenção do cliente, cor (verde/amarelo/vermelho/cinza)
            e mensagem sugerida para recuperar o lead.
          </p>
          <Link
            href="/dashboard/conversas"
            className="inline-flex items-center text-xs font-semibold text-emerald-300 hover:text-emerald-200"
          >
            Ir para Análise de conversas →
          </Link>
        </div>

        <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold mb-1">Status da conta</h3>
          <p className="text-xs text-slate-400 mb-3">
            Em breve, você verá aqui o status da sua assinatura, plano atual e
            data de renovação, integrado automaticamente com o checkout da
            HeroSpark.
          </p>
          <span className="inline-flex text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">
            Em desenvolvimento
          </span>
        </div>

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