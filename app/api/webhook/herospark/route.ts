export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

type WebhookPayload = {
  email?: string
  checkout_id?: string
  event?: string
  name?: string
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    console.error("Supabase env vars missing", { url: !!url, serviceKey: !!serviceKey })
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_KEY missing")
  }

  return createClient(url, serviceKey)
}

async function findOrCreateUser(
  supabase: SupabaseClient,
  email: string,
  name?: string
) {
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (selectError) {
    console.error("Erro ao buscar usuário:", selectError)
    throw selectError
  }

  if (existing) {
    console.log("Usuário já existe:", existing.id)
    return existing.id as string
  }

  const safeName =
    name && name.trim().length > 0
      ? name.trim()
      : email.split("@")[0] // fallback: parte antes do @

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({ email, name: safeName })
    .select()
    .single()

  if (insertError || !created) {
    console.error("Erro ao criar usuário:", insertError)
    throw insertError
  }

  console.log("Usuário criado:", created.id)
  return created.id as string
}

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
    console.error("Erro ao ativar assinatura:", error)
    throw error
  }

  console.log("Assinatura criada para user_id:", userId, "checkout:", checkoutId)
}

async function renewSubscription(supabase: SupabaseClient, sub: any) {
  const expires = new Date(sub.expires_at)
  expires.setDate(expires.getDate() + 30)

  const { error } = await supabase
    .from("subscriptions")
    .update({
      expires_at: expires.toISOString(),
      last_payment_status: "approved",
    })
    .eq("id", sub.id)

  if (error) {
    console.error("Erro ao renovar assinatura:", error)
    throw error
  }

  console.log("Assinatura renovada, id:", sub.id)
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.HEROSPARK_WEBHOOK_SECRET
    const received = req.headers.get("x-herospark-secret")

    if (!secret) {
      console.error("HEROSPARK_WEBHOOK_SECRET não configurado")
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 }
      )
    }

    if (received !== secret) {
      console.warn("Webhook recusado: segredo inválido")
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as WebhookPayload
    console.log("Webhook recebido da HeroSpark:", body)

    const email = body.email
    const checkoutId = body.checkout_id
    const event = body.event
    const name = body.name

    if (!email) {
      console.warn("Webhook sem email, ignorando")
      return NextResponse.json({ ok: true, skipped: "no_email", version: "v2" })
    }

    const supabase = getSupabaseAdmin()
    const userId = await findOrCreateUser(supabase, email, name)

    if (event === "payment_approved") {
      if (!checkoutId) {
        console.warn("payment_approved sem checkout_id")
        return NextResponse.json({ ok: true, warning: "no_checkout_id", version: "v2" })
      }

      const { data: existing, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("checkout_id", checkoutId)
        .maybeSingle()

      if (error) {
        console.error("Erro ao buscar assinatura:", error)
        throw error
      }

      if (!existing) {
        await activateSubscription(supabase, userId, checkoutId)
      } else {
        await renewSubscription(supabase, existing)
      }
    } else {
      console.log("Evento ignorado (não é payment_approved):", event)
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
