import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { createClient } from "@supabase/supabase-js"
import { parseWhatsappConversation } from "@/lib/whatsappParser"

// --------------- ENVs ---------------

const GROQ_API_KEY = process.env.GROQ_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!GROQ_API_KEY) {
  console.error("[ReativaPro] FALTA GROQ_API_KEY no ambiente")
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[ReativaPro] FALTAM variáveis do Supabase (URL ou SERVICE_KEY)")
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase URL ou SERVICE_KEY não configurados")
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function getGroqClient() {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada")
  return new Groq({ apiKey: GROQ_API_KEY })
}

// --------------- POST /api/conversas/analisar ---------------

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get("file")
    const meuNome = formData.get("meuNome")

    // ---- validações básicas ----

    if (!(file instanceof Blob)) {
      console.error(
        "[ReativaPro] FormData NÃO contém arquivo válido em 'file':",
        file,
      )
      return NextResponse.json(
        { ok: false, error: "file_missing" },
        { status: 400 },
      )
    }

    if (typeof meuNome !== "string" || !meuNome.trim()) {
      console.error("[ReativaPro] Campo 'meuNome' vazio ou inválido:", meuNome)
      return NextResponse.json(
        { ok: false, error: "meuNome_missing" },
        { status: 400 },
      )
    }

    const nomeNormalizado = meuNome.trim()

    // ---- lê o conteúdo do .txt ----

    const rawText = await file.text()

    // faz limpeza básica e separa mensagens
    const parsed = parseWhatsappConversation(rawText, nomeNormalizado)

    const textoLimpo = parsed.cleanedText
    const titulo = parsed.title ?? file.name

    // ------------------- GROQ -------------------

    const groq = getGroqClient()

    const systemPrompt = `
Você é um especialista em CRM e recuperação de vendas por WhatsApp.

Você vai receber o histórico de uma conversa entre "MEU LADO" (vendedor) e "CLIENTE".
O texto já está limpo de cabeçalhos de data/horário.

Sua tarefa é analisar essa conversa e devolver APENAS um JSON válido, no formato:

{
  "summary": "resumo curto em português, 2 a 4 frases",
  "intentLevel": "alta" | "media" | "baixa" | "nenhuma",
  "color": "green" | "yellow" | "red" | "gray",
  "suggestedMessage": "mensagem de follow-up em primeira pessoa, com tom humano, tentando recuperar a venda sem ser apelativo"
}

Regras:
- "green": cliente MUITO quente
- "yellow": cliente morno / interessado, mas com dúvidas
- "red": cliente frio ou resistente
- "gray": conversa inconclusiva, sem sinais claros

para cada cor a mensagem sugerida deve ter a sua própria estratégia mas sem sair do contexto.
Exemplo: 

- "Cor green" = mensagem sugerida de acordo com o contexto, aplicando estrátegias leves mas bem convencentes.
- "Cor yellow" = mensagem sugerida de acordo com o contexto, aplicando estrátegias boas e fortes e bastante convencentes.       
- "Cor red" = mensagem sugerida de acordo com o contexto, aplicando estrátegias MUITO FORTES E MUITO CONVENCENTES, Pode usar as melhores estrátegias de reativamento de cliente/Vendas (mas sem parecer apelativo). Dê o Máximo de prioridade de qualidade de respostas para os clientes que forem classificado com essa cor.
"Cor gray" = mensagem sugerida de acordo com o contexto, aplicando estrátegias muito leves e que tenha um pouco de chance de conseguir convencer.

(use estrátegias de vendas nas mensagem sugerida)

Responda SOMENTE com o JSON, sem comentários, sem texto fora do JSON.
`

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Histórico da conversa:\n\n${parsed.cleanedText}`,
        },
      ],
    })

    const aiText =
      completion.choices[0]?.message?.content?.trim() ?? ""

    // ------------------- parse do JSON da IA -------------------

    let summary = ""
    let intentLevel = "nenhuma"
    let color = "gray"
    let suggestedMessage = ""

    try {
      const jsonStart = aiText.indexOf("{")
      const jsonEnd = aiText.lastIndexOf("}")
      const onlyJson =
        jsonStart >= 0 && jsonEnd > jsonStart
          ? aiText.slice(jsonStart, jsonEnd + 1)
          : aiText

      const parsedJson = JSON.parse(onlyJson)

      summary = parsedJson.summary || ""
      intentLevel = parsedJson.intentLevel || "nenhuma"
      color = (parsedJson.color || "gray").toLowerCase()
      suggestedMessage = parsedJson.suggestedMessage || ""
    } catch (err) {
      console.error("[ReativaPro] Falha ao parsear JSON do Groq:", err, aiText)
      // fallback simples
      summary =
        "Análise automática não estruturada. A IA respondeu algo que não estava em JSON válido."
      color = "gray"
      intentLevel = "nenhuma"
      suggestedMessage =
        "Oi, tudo bem? Estava revisando nossa conversa e vi que ficou em aberto. Se ainda fizer sentido pra você, posso te ajudar a decidir com calma, sem pressão 😊"
    }

    // ------------------- salvar no Supabase -------------------

    try {
      const supabase = getSupabaseAdmin()

      const { error: dbError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          file_name: (file as any).name ?? "conversa.txt",
          title: parsed.title ?? null,
          summary,
          intent_level: intentLevel,
          color,
        })

      if (dbError) {
        console.error(
          "[ReativaPro] Erro ao salvar conversa em whatsapp_conversations:",
          dbError,
        )
      }
    } catch (err) {
      console.error(
        "[ReativaPro] Erro ao salvar no Supabase (whatsapp_conversations):",
        err,
      )
    }

    // ------------------- resposta final -------------------

    return NextResponse.json({
      ok: true,
      summary,
      intentLevel,
      color,
      suggestedMessage,
    })
  } catch (err) {
    console.error("[ReativaPro] ERRO GERAL em /api/conversas/analisar:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    )
  }
}