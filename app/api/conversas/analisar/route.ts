export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

async function chamarIA(conteudo: string, meuNome: string) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada")
  }

  const prompt = `
Você é um assistente especializado em análise de conversas de WhatsApp entre vendedor e cliente.

A conversa a seguir foi exportada do WhatsApp (texto puro). A pessoa chamada "${meuNome}" é o VENDEDOR. 
A outra(s) pessoa(s) é(são) o(s) cliente(s).

Você é um especialista em análise de conversas de WhatsApp focado em vendas, copywriting e comportamento do consumidor.

A conversa abaixo foi exportada do WhatsApp. A pessoa chamada “MEU_NOME” é o vendedor.  
O restante das mensagens são do cliente.

Você deve analisar a conversa e retornar **EXATAMENTE** o JSON final, seguindo estritamente o formato:

{
  "summary": string,               // resumo profissional e claro
  "intentLevel": string,           // altíssima, alta, média, baixa, baixíssima
  "color": string,                 // GREEN, YELLOW, RED, GRAY
  "suggestedMessage": string       // a melhor mensagem possível para recuperar o cliente agora
}

REGRAS IMPORTANTES:

- GREEN → intenção alta, respostas rápidas, perguntas objetivas, abertura para oferta (Prioridade leve)
- YELLOW → intenção média, cliente interessado mas hesitante (Prioridade Mediana)
- RED → cliente rejeitando, sumindo, dando desculpas fortes (Máxima prioridade)
- GRAY → cliente não demonstra intenção clara, conversa casual ou fria ou apenas "curioso"

para cada cor a mensagem sugerida deve ter a estratégia psicologica de vendas pra cada cor.
Exemplo: 
Cor GREEN = mensagem sugerida de acordo com o contexto, aplicando estrátegias leves mas bem convencentes.
Cor YELLOW = mensagem sugerida de acordo com o contexto, aplicando estrátegias boas e fortes e bastante convencentes.       
Cor RED = mensagem sugerida de acordo com o contexto, aplicando estrátegias MUITO FORTES E MUITO CONVENCENTES, Pode usar as melhores estrátegias de reativamento de cliente/Vendas. Dê o Máximo de prioridade para os clientes que forem classificado com essa cor, pode demorar até 40 segundos pra gerar a resposta se caso quiser tempo pra pensar na melhor resposta.
Cor Gray = mensagem sugerida de acordo com o contexto, aplicando estrátegias muito leves e que tenha um pouco de chance de conseguir convencer.

O resumo deve ser:
- objetivo
- técnico
- direto ao ponto

A mensagem sugerida deve:
- usar linguagem humana e natural
- parecer real, não robótica
- criar conexão
- mover o cliente para ação
- respeitar o contexto
- ser escrita como um vendedor profissional
- pode conter emojis legais e que combine com a conversa ou com a mensagem sugerida.

NÃO inclua comentários, markdown, explicações ou texto fora do JSON.

CONVERSA:

TEXTO_DA_CONVERSA_AQUI

${conteudo}
`.trim()

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "Você é um analisador de conversas de WhatsApp focado em vendas e recuperação de clientes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("Erro da OpenAI:", text)
    throw new Error("Falha ao chamar modelo de IA")
  }

  const json = (await response.json()) as any
  const content = json.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("Resposta vazia da IA")
  }

  // Tenta interpretar a resposta como JSON
  let parsed: {
    summary: string
    intentLevel: string
    color: string
    suggestedMessage: string
  }

  try {
    parsed = JSON.parse(content)
  } catch (err) {
    console.error("Falha ao fazer parse do JSON da IA:", content)
    throw new Error("Resposta da IA não está em JSON válido")
  }

  return parsed
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const meuNome = String(formData.get("meuNome") || "").trim() || "Você"

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "missing_file" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const fileName = file.name || "conversa_whatsapp.txt"
    const buffer = await file.arrayBuffer()
    const conteudo = Buffer.from(buffer).toString("utf-8")

    // Chama IA para analisar
    const ia = await chamarIA(conteudo, meuNome)

    const summary = ia.summary
    const intentLevel = ia.intentLevel
    const color = ia.color
    const suggestedMessage = ia.suggestedMessage

    // Salva no banco para histórico
    await supabase.from("whatsapp_conversations").insert({
      file_name: fileName,
      title: fileName,
      summary,
      intent_level: intentLevel,
      color,
      suggested_message: suggestedMessage,
      raw_text: conteudo,
    })

    return NextResponse.json({
      ok: true,
      summary,
      intentLevel,
      color,
      suggestedMessage,
    } as const)
  } catch (err: any) {
    console.error("Erro em /api/conversas/analisar:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}