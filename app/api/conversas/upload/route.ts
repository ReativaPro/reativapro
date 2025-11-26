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

type ParsedMessage = {
  sender: string
  role: "seller" | "client"
  text: string
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

// Parse básico de conversa exportada do WhatsApp em pt-BR
function parseWhatsAppText(
  raw: string,
  sellerName: string
): ParsedMessage[] {
  const normalizedSeller = normalizeName(sellerName || "Você")
  const lines = raw.split(/\r?\n/)
  const messages: ParsedMessage[] = []

  const lineRegex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s+(.*)$/

  for (const line of lines) {
    if (!line.trim()) continue

    const match = line.match(lineRegex)
    if (match) {
      const senderName = match[3].trim()
      const text = match[4].trim()

      const role: "seller" | "client" =
        normalizeName(senderName) === normalizedSeller ? "seller" : "client"

      messages.push({ sender: senderName, role, text })
    } else if (messages.length > 0) {
      // Linha de continuação (mensagem grande quebrada em várias linhas)
      messages[messages.length - 1].text += "\n" + line.trim()
    }
  }

  return messages
}

// ANALISADOR SIMPLES (MVP) – depois a gente troca por IA de verdade
function analyzeConversation(messages: ParsedMessage[]) {
  const clientTexts = messages
    .filter((m) => m.role === "client")
    .map((m) => m.text)
    .join(" ")
    .toLowerCase()

  let color: "green" | "yellow" | "red" | "gray" = "gray"
  let intent_level: "alta" | "media" | "baixa" | "nenhuma" = "nenhuma"
  const main_objections: string[] = []

  if (clientTexts.match(/preço|valor|custa|desconto|parcel/)) {
    color = "yellow"
    intent_level = "media"
  }

  if (clientTexts.match(/fechar|vou comprar|quero sim|onde pago|como faço para pagar/)) {
    color = "green"
    intent_level = "alta"
  }

  if (clientTexts.match(/caro|sem dinheiro|agora não|talvez depois|não tenho grana/)) {
    main_objections.push("preço / dinheiro / prioridade")
  }

  if (color === "gray" && clientTexts.length > 0) {
    intent_level = "baixa"
  }

  const summary =
    "Análise automática simples para teste. Depois vamos substituir isso por IA de verdade."

  const followup_script =
    "Oi, tudo bem? Estava revisando nossa conversa e vi que você tinha interesse, mas ficou alguma dúvida ou pendência. Posso te ajudar a decidir hoje, de um jeito mais leve, sem pressão, só pra ver se faz sentido pra você?"

  return {
    color,
    intent_level,
    main_objections,
    summary,
    followup_script,
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get("file")
    const userId = formData.get("userId")?.toString() || null
    const sellerName =
      formData.get("sellerName")?.toString() || "Você"

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "missing_file" },
        { status: 400 }
      )
    }

    const fileName = file.name
    const rawText = await file.text()

    if (!rawText.trim()) {
      return NextResponse.json(
        { ok: false, error: "empty_file" },
        { status: 400 }
      )
    }

    const messages = parseWhatsAppText(rawText, sellerName)
    const analysis = analyzeConversation(messages)

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .insert({
        user_id: userId,
        file_name: fileName,
        raw_text: rawText,
        summary: analysis.summary,
        color: analysis.color,
        intent_level: analysis.intent_level,
        main_objections: analysis.main_objections.join(" | "),
        followup_script: analysis.followup_script,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao salvar análise no Supabase:", error)
      return NextResponse.json(
        { ok: false, error: "db_insert_failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      conversation: data,
    })
  } catch (err) {
    console.error("Erro inesperado em /api/conversas/upload:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}
