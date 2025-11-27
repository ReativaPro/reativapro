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

Sua tarefa é analisar a conversa e responder ESTRITAMENTE em JSON, sem texto extra, no seguinte formato:

{
  "summary": string, // resumo bem claro da conversa, em 3 a 5 frases
  "intentLevel": string, // um desses: "baixíssima", "baixa", "média", "alta", "altíssima"
  "color": string, // uma dessas: "GREEN", "YELLOW", "RED", "GRAY"
  "suggestedMessage": string // mensagem pronta para o vendedor enviar AGORA ao cliente
}

REGRAS:
- "GREEN": cliente muito interessado, pede preço, pergunta detalhes, só não comprou ainda.
- "YELLOW": cliente interessado mas com dúvidas, enrola um pouco, não decide, mas tem chance.
- "RED": cliente rejeita, diz que não quer, não tem dinheiro, objeção muito forte.
- "GRAY": lead frio, só curioso, conversa muito solta, não parece realmente querer comprar.

NUNCA quebre o formato JSON. Nada de comentário, nada de explicação, nada de markdown.
Apenas o JSON válido.

CONVERSA:

${conteudo}
`.trim()

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
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