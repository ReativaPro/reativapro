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

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // Conta quantas conversas existem na tabela whatsapp_conversations
    const { count, error } = await supabase
      .from("whatsapp_conversations")
      .select("*", { count: "exact", head: true })

    if (error) {
      console.error("Erro ao buscar resumo de dashboard:", error)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      totalConversations: count ?? 0,
    })
  } catch (err) {
    console.error("Erro inesperado em /api/dashboard/resumo:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}