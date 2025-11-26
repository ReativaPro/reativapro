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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "missing_email" },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const supabase = getSupabaseAdmin()

    // 1) Busca o usuário na tabela users
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error("Erro ao buscar user:", userError)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    if (!user) {
      // sem usuário = sem assinatura
      return NextResponse.json({
        ok: true,
        foundUser: false,
        subscription: null,
        status: "no_user",
      })
    }

    // 2) Busca a assinatura mais recente desse user
    const nowIso = new Date().toISOString()

    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (subsError) {
      console.error("Erro ao buscar subscriptions:", subsError)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        ok: true,
        foundUser: true,
        subscription: null,
        status: "no_subscription",
      })
    }

    // pega a última assinaturas criada
    const latest = subs[0]

    let subscriptionStatus: "active" | "expired" | "pending" = "expired"

    if (
      latest.status === "active" &&
      latest.expires_at &&
      latest.expires_at > nowIso
    ) {
      subscriptionStatus = "active"
    } else if (latest.status === "active") {
      subscriptionStatus = "expired"
    } else if (latest.status === "pending") {
      subscriptionStatus = "pending"
    }

    return NextResponse.json({
      ok: true,
      foundUser: true,
      status: subscriptionStatus,
      subscription: {
        plan: latest.plan,
        status: latest.status,
        expires_at: latest.expires_at,
        started_at: latest.started_at,
        last_payment_status: latest.last_payment_status,
      },
    })
  } catch (err) {
    console.error("Erro inesperado em /api/assinatura/status:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}