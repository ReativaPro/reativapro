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

    // Total de usuários
    const { count: totalUsers, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })

    if (usersError) throw usersError

    // Total de assinaturas
    const { count: totalSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })

    if (subsError) throw subsError

    // Assinaturas ativas
    const { count: activeSubs, error: activeError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    if (activeError) throw activeError

    // Total de conversas de WhatsApp
    const { count: totalConversations, error: convError } =
      await supabase
        .from("whatsapp_conversations")
        .select("*", { count: "exact", head: true })

    if (convError) throw convError

    return NextResponse.json({
      ok: true,
      totalUsers: totalUsers ?? 0,
      totalSubs: totalSubs ?? 0,
      activeSubs: activeSubs ?? 0,
      totalConversations: totalConversations ?? 0,
    })
  } catch (err) {
    console.error("Erro em /api/admin/overview:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}