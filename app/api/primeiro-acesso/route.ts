export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

type PrimeiroAcessoPayload = {
  email?: string
  password?: string
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

async function getUserByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar user por email:", error)
    throw error
  }

  return data
}

async function hasActiveSubscription(supabase: SupabaseClient, userId: string) {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar assinatura ativa:", error)
    throw error
  }

  return !!data
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PrimeiroAcessoPayload
    console.log("Primeiro acesso recebido:", body)

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const name = body.name?.trim()

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "weak_password" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1) Verifica se existe user com esse e-mail
    const userRow = await getUserByEmail(supabase, email)

    if (!userRow) {
      console.warn("Primeiro acesso sem usuário na tabela users:", email)
      return NextResponse.json(
        { ok: false, error: "user_not_found" },
        { status: 404 }
      )
    }

    // 2) Verifica se tem assinatura ativa
    const hasActive = await hasActiveSubscription(supabase, userRow.id)

    if (!hasActive) {
      console.warn("Primeiro acesso sem assinatura ativa:", email)
      return NextResponse.json(
        { ok: false, error: "no_active_subscription" },
        { status: 403 }
      )
    }

    // 3) Opcional: atualizar name na tabela users, se veio algo novo
    if (name && name.length > 0 && name !== userRow.name) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name })
        .eq("id", userRow.id)

      if (updateError) {
        console.error("Erro ao atualizar name em users:", updateError)
        // não vamos falhar o fluxo só por isso
      }
    }

    // 4) Verifica se já existe user no Auth
    const { data: authList, error: listError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        email,
      })

    if (listError) {
      console.error("Erro ao listar usuários do Auth:", listError)
      throw listError
    }

    const alreadyExists =
      authList?.users && authList.users.length > 0 ? authList.users[0] : null

    if (alreadyExists) {
      console.log("Usuário Auth já existia, apenas retornando ok:", email)
      return NextResponse.json({
        ok: true,
        already_exists: true,
        version: "primeiro-acesso-v1",
      })
    }

    // 5) Cria usuário no Auth com senha
    const { data: createdAuth, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name || userRow.name || email.split("@")[0],
        },
      })

    if (createError || !createdAuth) {
      console.error("Erro ao criar usuário no Auth:", createError)
      return NextResponse.json(
        { ok: false, error: "auth_create_failed" },
        { status: 500 }
      )
    }

    console.log("Usuário Auth criado com sucesso:", createdAuth.user?.id)

    return NextResponse.json({
      ok: true,
      version: "primeiro-acesso-v1",
    })
  } catch (err) {
    console.error("Erro inesperado em /api/primeiro-acesso:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}
