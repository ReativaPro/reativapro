export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

// ---------- OPENAI ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// ---------- SUPABASE ADMIN ----------
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    console.warn(
      "[ReativaPro] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados. Análises não serão salvas no banco."
    )
    return null
  }

  return createClient(url, key)
}

// ---------- PARSER DE WHATSAPP ----------

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acentos
    .replace(/[^a-zA-Z0-9]/g, "") // tira espaços e pontuação
    .toLowerCase()
}

type ParsedMessage = {
  author: "me" | "client"
  text: string
}

/**
 * Recebe o texto cru exportado do WhatsApp e o nome do vendedor
 * e devolve uma conversa normalizada no formato:
 *
 * MEU_NOME: mensagem...
 * CLIENTE:  mensagem...
 */
function parseWhatsappConversation(raw: string, myName: string): string {
  const myNorm = normalizeName(myName || "Você")

  const lines = raw.replace(/\r\n/g, "\n").split("\n")

  // Aceita:
  // 09/11/2025 15:59 - Nome: msg
  // 09/11/2025, 15:59 - Nome: msg
  const dateRegex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4})[, ]\s+(\d{1,2}:\d{2})\s*-\s*(.+)$/

  const messages: ParsedMessage[] = []
  let current: ParsedMessage | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Ignora mensagens de sistema tipo:
    // "As mensagens e ligações são protegidas..."
    if (
      line.includes("As mensagens e ligações são protegidas") ||
      line.includes("As mensagens e chamadas são protegidas") ||
      line.startsWith("Mensagens e chamadas")
    ) {
      continue
    }

    const m = line.match(dateRegex)

    // NÃO bateu com formato de data → continuação da última mensagem
    if (!m) {
      if (current) {
        current.text += " " + line
      }
      continue
    }

    const rest = m[3] // "Pontoviral: Opa, tudo bem?"

    const colonIndex = rest.indexOf(":")
    if (colonIndex === -1) {
      // linha de sistema (entrou no grupo, etc). Ignora.
      continue
    }

    const namePart = rest.slice(0, colonIndex).trim()
    const msgPart = rest.slice(colonIndex + 1).trim()

    const authorNorm = normalizeName(namePart)

    const author: "me" | "client" =
      authorNorm === myNorm ? "me" : "client"

    current = {
      author,
      text: msgPart,
    }

    messages.push(current)
  }

  if (messages.length === 0) {
    // fallback: devolve texto cru mesmo pra IA tentar se virar
    return raw
  }

  // Monta um texto limpo pra IA
  const formatted = messages
    .map((m) => {
      const label = m.author === "me" ? "MEU_NOME" : "CLIENTE"
      return `${label}: ${m.text}`
    })
    .join("\n")

  return formatted
}

// ---------- HANDLER PRINCIPAL ----------

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const myName = String(formData.get("myName") ?? "").trim()

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "missing_file" },
        { status: 400 }
      )
    }

    const originalText = await file.text()

    // 🔥 Parser inteligente de WhatsApp
    const conversationText = parseWhatsappConversation(originalText, myName)

    const prompt = `
Você é um especialista em análise de conversas de WhatsApp focado em vendas,
copywriting e comportamento do consumidor.

A conversa abaixo foi exportada do WhatsApp.
A pessoa chamada "MEU_NOME" é o vendedor.
As mensagens marcadas como "CLIENTE" são do potencial comprador.

Você deve analisar a conversa e retornar EXATAMENTE o seguinte JSON:

{
  "summary": string,               // resumo profissional e claro
  "intentLevel": string,           // altíssima, alta, média, baixa, baixíssima
  "color": string,                 // GREEN, YELLOW, RED, GRAY
  "suggestedMessage": string       // a melhor mensagem possível para recuperar o cliente agora
}

REGRAS PARA INTENÇÃO:
- altíssima  → cliente muito engajado, respondeu rápido, fez perguntas claras, demonstrou interesse forte
- alta       → cliente demonstrou interesse, respondeu bem, mas está com alguma dúvida ou objeção leve
- média      → cliente mostrou curiosidade, mas não avançou muito, respostas mais superficiais
- baixa      → cliente respondeu pouco, muitas quebras na conversa, sinais de desinteresse
- baixíssima → cliente praticamente ignorou, recusou claramente, ou encerrou o assunto

REGRAS IMPORTANTES:

- GREEN → intenção alta, respostas rápidas, perguntas objetivas, abertura para oferta (Prioridade leve)
- YELLOW → intenção média, cliente interessado mas hesitante (Prioridade Mediana)
- RED → cliente rejeitando, sumindo, dando desculpas fortes (Máxima prioridade)
- GRAY → cliente não demonstra intenção clara, conversa casual ou fria ou apenas "curioso"

para cada cor a mensagem sugerida deve ter a estratégia psicologica de vendas pra cada cor.
Exemplo: 

Cor GREEN = mensagem sugerida de acordo com o contexto, aplicando estrátegias leves mas bem convencentes.

Cor YELLOW = mensagem sugerida de acordo com o contexto, aplicando estrátegias boas e fortes e bastante convencentes.       

Cor RED = mensagem sugerida de acordo com o contexto, aplicando estrátegias MUITO FORTES E MUITO CONVENCENTES, Pode usar as melhores estrátegias de reativamento de cliente/Vendas. Dê o Máximo de prioridade para os clientes que forem classificado com essa cor.

Cor Gray = mensagem sugerida de acordo com o contexto, aplicando estrátegias muito leves e que tenha um pouco de chance de conseguir convencer.

O resumo deve ser:
- objetivo
- técnico
- direto ao ponto
- focado na jornada do cliente (interesse, objeções, recuos, comportamento)

A mensagem sugerida deve:
- usar linguagem humana e natural
- parecer escrita por um vendedor profissional experiente
- criar conexão e mostrar que o cliente foi ouvido
- mover o cliente para uma próxima ação clara (responder, marcar horário, tomar decisão)
- respeitar o contexto da conversa (não repetir o que já foi dito de forma chata)
- pode conter emojis legais e que combine com a conversa ou com a mensagem sugerida.

NÃO inclua comentários, markdown, explicações ou texto fora do JSON.
Apenas retorne o JSON puro.

CONVERSA:

${conversationText}
`.trim()

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const raw = completion.choices[0].message.content?.trim() ?? "{}"

    let parsed: {
      summary?: string
      intentLevel?: string
      color?: string
      suggestedMessage?: string
    }

    try {
      parsed = JSON.parse(raw)
    } catch (jsonError) {
      console.error(
        "[ReativaPro] Erro ao fazer JSON.parse da resposta da IA:",
        jsonError,
        "Resposta bruta:",
        raw
      )
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_ai_response",
        },
        { status: 500 }
      )
    }

    const summary = parsed.summary ?? ""
    const intentLevel = parsed.intentLevel ?? "desconhecida"
    const color = parsed.color ?? "GRAY"
    const suggestedMessage = parsed.suggestedMessage ?? ""

    // ---------- SALVAR NO SUPABASE (BEST-EFFORT) ----------
    try {
      const supabase = getSupabaseAdmin()
      if (supabase) {
        const { error: dbError } = await supabase
          .from("whatsapp_conversations")
          .insert({
            file_name: file.name,
            seller_name: myName || null,
            original_text: originalText,
            normalized_text: conversationText,
            ai_summary: summary,
            ai_intent_level: intentLevel,
            ai_color: color,
            ai_suggested_message: suggestedMessage,
          })

        if (dbError) {
          console.error(
            "[ReativaPro] Erro ao salvar análise no Supabase:",
            dbError
          )
        }
      }
    } catch (dbFatal) {
      console.error(
        "[ReativaPro] Erro inesperado ao tentar salvar no Supabase:",
        dbFatal
      )
      // não quebramos a resposta pro usuário por causa disso
    }

    // ---------- RESPOSTA PARA O FRONT ----------
    return NextResponse.json({
      ok: true,
      result: {
        summary,
        intentLevel,
        color,
        suggestedMessage,
      },
      version: "analisar-v2-gpt4.1",
    })
  } catch (err) {
    console.error("[ReativaPro] Erro inesperado na rota /api/conversas/analisar:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    )
  }
}