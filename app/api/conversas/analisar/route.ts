import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ---------- IA (GROQ) ----------
const GROQ_API_KEY = process.env.GROQ_API_KEY!

async function analyseWithGroq(text: string, userName: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: `
Você é uma IA especialista em vendas e comportamento humano.
Receberá uma conversa do WhatsApp exportada em .txt.
Sua tarefa é:

REGRAS PARA INTENÇÃO:
- altíssima  → cliente muito engajado, respondeu rápido, fez perguntas claras, demonstrou interesse forte
- alta       → cliente demonstrou interesse, respondeu bem, mas está com alguma dúvida ou objeção leve
- média      → cliente mostrou curiosidade, mas não avançou muito, respostas mais superficiais
- baixa      → cliente respondeu pouco, muitas quebras na conversa, sinais de desinteresse
- baixíssima → cliente praticamente ignorou, recusou claramente, ou encerrou o assunto

1) Regras  pra cores:
- GREEN → intenção alta, respostas rápidas, perguntas objetivas, abertura para oferta (Prioridade leve)
- YELLOW → intenção média, cliente interessado mas hesitante (Prioridade Mediana)
- RED → cliente rejeitando, sumindo, dando desculpas fortes (Máxima prioridade)
- GRAY → cliente não demonstra intenção clara, conversa casual ou fria ou apenas "curioso"

2) Explicar a intenção em 1 frase.

3) para cada cor a mensagem sugerida deve ter a estratégia psicologica de vendas pra cada cor.
Exemplo: 

Cor GREEN = mensagem sugerida de acordo com o contexto, aplicando estrátegias leves mas bem convencentes.
Cor YELLOW = mensagem sugerida de acordo com o contexto, aplicando estrátegias boas e fortes e bastante convencentes.       
Cor RED = mensagem sugerida de acordo com o contexto, aplicando estrátegias MUITO FORTES E MUITO CONVENCENTES, Pode usar as melhores estrátegias de reativamento de cliente/Vendas. Dê o Máximo de prioridade para os clientes que forem classificado com essa cor.
Cor Gray = mensagem sugerida de acordo com o contexto, aplicando estrátegias muito leves e que tenha um pouco de chance de conseguir convencer.

4) O resumo deve ser:
- objetivo
- técnico
- direto ao ponto
- focado na jornada do cliente (interesse, objeções, recuos, comportamento)

5) A mensagem sugerida deve:
- usar linguagem humana e natural
- parecer escrita por um vendedor profissional experiente
- criar conexão e mostrar que o cliente foi ouvido
- mover o cliente para uma próxima ação clara (responder, marcar horário, tomar decisão)
- respeitar o contexto da conversa (não repetir o que já foi dito de forma chata)
- pode conter emojis legais e que combine com a conversa ou com a mensagem sugerida.


6) Gerar mensagem perfeita para recuperar esse cliente.
            `,
        },
        {
          role: "user",
          content: `Meu nome na conversa é: ${userName}\n\nAqui está a conversa completa:\n${text}`,
        },
      ],
      temperature: 0.7,
    }),
  })

  const json = await response.json()

  if (json.error) {
    console.error("[ReativaPro] ERRO DA GROQ:", json.error)
    throw new Error(json.error.message || "Erro na IA")
  }

  return json.choices[0].message.content
}

// ---------- SUPABASE ----------
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ---------- ROTA PRINCIPAL ----------
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const formData = await req.formData()

    const file = formData.get("file") as File
    const userName = export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const formData = await req.formData()

    const file = formData.get("file") as File
    const userName = (formData.get("userName") as string)?.trim() || "Eu"
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: "Arquivo ou usuário inválido" },
        { status: 400 }
      )
    }

    const text = await file.text()

    // --- Chama a IA da Groq ---
    const result = await analyseWithGroq(text, userName)

    // --- Armazena ---
    const { error: insertError } = await supabase
      .from("whatsapp_conversations")
      .insert({
        user_id: userId,
        filename: file.name,
        content: text,
        analysis: result,
      })

    if (insertError) throw insertError

    return NextResponse.json({ ok: true, analysis: result })
  } catch (err: any) {
    console.error("[ReativaPro] Erro geral:", err.message || err)
    return NextResponse.json(
      { error: "Erro ao processar conversa" },
      { status: 500 }
    )
  }
}