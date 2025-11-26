export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// -----------------------------------------------------------------------------
// SUPABASE ADMIN
// -----------------------------------------------------------------------------
function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// -----------------------------------------------------------------------------
// PARSE UNIVERSAL DO BODY (JSON + form-urlencoded)
// -----------------------------------------------------------------------------
async function parseBody(req: NextRequest) {
  const raw = await req.text() // LÊ APENAS UMA VEZ

  // Tentar JSON
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      return JSON.parse(raw)
    } catch {
      // continua para parser urlencoded
    }
  }

  // Tentar form-urlencoded
  const params = new URLSearchParams(raw)
  const obj: any = {}
  params.forEach((value, key) => {
    obj[key] = value
  })

  return obj
}

// -----------------------------------------------------------------------------
// UP SERT USER
// -----------------------------------------------------------------------------
async function findOrCreateUser(supabase: any, email: string) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ email }, { onConflict: "email" })
    .select()
    .single()

  if (error) throw error
  return data.id
}

// -----------------------------------------------------------------------------
// CRIAR ASSINATURA
// -----------------------------------------------------------------------------
async function activateSubscription(supabase: any, userId: string, checkoutId: string) {
  const now = new Date()
  const expires = new Date()
  expires.setDate(now.getDate() + 30)

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan: "mensal_59",
    status: "active",
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
    checkout_id: checkoutId,
    last_payment_status: "approved",
  })

  if (error) throw error
}

// -----------------------------------------------------------------------------
// RENOVAR ASSINATURA
// -----------------------------------------------------------------------------
async function renewSubscription(supabase: any, sub: any, checkoutId: string) {
  const expires = new Date(sub.expires_at)
  expires.setDate(expires.getDate() + 30)

  const { error } = await supabase
    .from("subscriptions")
    .update({
      expires_at: expires.toISOString(),
      last_payment_status: "approved",
      checkout_id: checkoutId,
    })
    .eq("id", sub.id)

  if (error) throw error
}

// -----------------------------------------------------------------------------
// WEBHOOK HANDLER
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Validar segredo
    const secret = process.env.HEROSPARK_WEBHOOK_SECRET
    const received = req.headers.get("x-herospark-secret")
    if (!secret || received !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // Body universal
    const body = await parseBody(req)
    console.log("Webhook HeroSpark recebido:", body)

    const event = (body.event || "").toLowerCase()
    const email = body.email?.toLowerCase()
    let checkoutId =
      body.checkout_id ||
      body.transaction_code ||
      body.sale_id ||
      `no-checkout-${Date.now()}`

    if (!email) {
      console.warn("Webhook sem email → ignorado")
      return NextResponse.json({ ok: true, ignored: true })
    }

    const supabase = getSupabaseAdmin()
    const userId = await findOrCreateUser(supabase, email)

    if (event === "payment_approved") {
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("checkout_id", checkoutId)
        .maybeSingle()

      if (!existing) {
        console.log("Criando nova assinatura:", checkoutId)
        await activateSubscription(supabase, userId, checkoutId)
      } else {
        console.log("Renovando assinatura:", checkoutId)
        await renewSubscription(supabase, existing, checkoutId)
      }
    } else {
      console.log("Evento ignorado:", event)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Erro inesperado no webhook HeroSpark:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}
