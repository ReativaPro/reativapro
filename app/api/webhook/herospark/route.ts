export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

type HeroSparkPayload = {
  event?: string
  email?: string
  checkout_id?: string
  transaction_code?: string
  sale_id?: string
  [key: string]: any
}

// -----------------------------------------------------------------------------
// Supabase admin client
// -----------------------------------------------------------------------------
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY ausentes nas env vars", {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
    })
    throw new Error("Supabase env vars missing")
  }

  return createClient(url, serviceKey)
}

// -----------------------------------------------------------------------------
// Garante usuário por e-mail usando UPSERT (evita erro 23505 de unique)
// -----------------------------------------------------------------------------
async function findOrCreateUser(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      { email }, // usa defaults pra name, phone etc.
      { onConflict: "email" }
    )
    .select()
    .single()

  if (error) {
    console.error("Erro em findOrCreateUser (upsert):", error)
    throw error
  }

  return data.id as string
}

// -----------------------------------------------------------------------------
// Cria assinatura inicial (+30 dias)
// -----------------------------------------------------------------------------
async function activateSubscription(
  supabase: SupabaseClient,
  userId: string,
  checkoutId: string
) {
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

  if (error) {
    console.error("Erro ao criar assinatura em subscriptions:", error)
    throw error
  }
}

// -----------------------------------------------------------------------------
// Renova assinatura existente (+30 dias)
// -----------------------------------------------------------------------------
async function renewSubscription(
  supabase: SupabaseClient,
  sub: any,
  checkoutId: string
) {
  const expires = new Date(sub.expires_at ?? new Date().toISOString())
  expires.setDate(expires.getDate() + 30)

  const { error } = await supabase
    .from("subscriptions")
    .update({
      expires_at: expires.toISOString(),
      last_payment_status: "approved",
      checkout_id: checkoutId || sub.checkout_id,
    })
    .eq("id", sub.id)

  if (error) {
    console.error("Erro ao renovar assinatura em subscriptions:", error)
    throw error
  }
}

// -----------------------------------------------------------------------------
// Handler principal do webhook
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.HEROSPARK_WEBHOOK_SECRET
    const received =
      req.headers.get("x-herospark-secret") ??
      req.headers.get("X-Herospark-Secret")

    if (!secret || received !== secret) {
      console.warn("Webhook HeroSpark recusado: segredo inválido", {
        received,
      })
      return NextResponse.json(
        { ok: false, error: "unauthorized", version: "v2" },
        { status: 401 }
      )
    }

    const body = (await req.json()) as HeroSparkPayload
    console.log("Webhook recebido da HeroSpark:", body)

    const rawEvent = body.event ?? ""
    const event = String(rawEvent).toLowerCase()

    // Normaliza e-mail
    const email = body.email?.trim().toLowerCase()

    // Normaliza checkoutId com fallback para campos comuns
    let checkoutId =
      body.checkout_id || body.transaction_code || body.sale_id || null

    if (!checkoutId) {
      console.warn("payment_approved sem checkout_id (provavelmente teste)", {
        body,
      })
      // fallback só pra não quebrar lógica; não depende de ser único
      checkoutId = `no-checkout-${email || "unknown"}-${Date.now()}`
    }

    // Se não tiver email, não temos como vincular a ninguém → ignora com ok
    if (!email) {
      console.warn("Webhook HeroSpark sem email, ignorando.", { body })
      return NextResponse.json(
        { ok: true, ignored: true, reason: "missing_email", version: "v2" },
        { status: 200 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Garante usuário
    const userId = await findOrCreateUser(supabase, email)

    // Lidamos apenas com payment_approved (por enquanto)
    if (event === "payment_approved") {
      // Verifica se já existe assinatura com esse checkout_id
      const { data: existing, error: selectError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("checkout_id", checkoutId)
        .maybeSingle()

      if (selectError) {
        console.error("Erro ao buscar assinatura por checkout_id:", selectError)
        throw selectError
      }

      if (!existing) {
        console.log("Criando nova assinatura para usuário", {
          userId,
          email,
          checkoutId,
        })
        await activateSubscription(supabase, userId, checkoutId)
      } else {
        console.log("Renovando assinatura existente", {
          subscriptionId: existing.id,
          checkoutId,
        })
        await renewSubscription(supabase, existing, checkoutId)
      }
    } else {
      // Outros eventos: só loga e responde ok
      console.log("Evento HeroSpark ignorado (não suportado ainda):", event)
    }

    return NextResponse.json({ ok: true, version: "v2" })
  } catch (err) {
    console.error("Erro inesperado no webhook HeroSpark:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error", version: "v2" },
      { status: 500 }
    )
  }
}
