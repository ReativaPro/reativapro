export default function ConfiguracoesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Configurações</h2>
      <p className="text-sm text-slate-400 max-w-xl">
        Em breve você poderá ajustar preferências da sua conta, dados do seu
        perfil e configurações avançadas do ReativaPro aqui.
      </p>

      <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40">
        <h3 className="text-sm font-semibold mb-2">
          Status desta área do painel
        </h3>
        <p className="text-xs text-slate-400">
          Esta página ainda é um rascunho. Estamos priorizando as partes que
          geram resultado direto (análise de conversas, assinatura e painel
          administrativo). Quando essas estiverem maduras, voltamos aqui para
          liberar ajustes finos de conta.
        </p>
      </div>
    </div>
  )
}