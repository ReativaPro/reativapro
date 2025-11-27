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

    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Erro ao listar conversas:", error)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      conversations: data ?? [],
    })
  } catch (err) {
    console.error(
      "Erro inesperado em /api/dashboard/conversas/list:",
      err
    )
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}