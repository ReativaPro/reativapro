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
    const { email, password, name } = await req.json()

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

    const normalizedEmail = String(email).toLowerCase().trim()

    const supabase = getSupabaseAdmin()

    // 1) Verificar se o usuário existe na tabela users
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error("Erro ao buscar user em users:", userError)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    if (!userRow) {
      // nunca passou pelo webhook (sem compra)
      return NextResponse.json(
        { ok: false, error: "user_not_found" },
        { status: 400 }
      )
    }

    // 2) Verificar se há assinatura ativa para este user
    const nowIso = new Date().toISOString()

    const { data: subRow, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userRow.id)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .maybeSingle()

    if (subError) {
      console.error("Erro ao buscar subscription:", subError)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    if (!subRow) {
      return NextResponse.json(
        { ok: false, error: "no_active_subscription" },
        { status: 400 }
      )
    }

    // 3) Atualizar nome no users, se informado
    if (name && String(name).trim().length > 0) {
      const { error: updateNameError } = await supabase
        .from("users")
        .update({ name: String(name).trim() })
        .eq("id", userRow.id)

      if (updateNameError) {
        console.error("Erro ao atualizar nome:", updateNameError)
      }
    }

    // 4) Garantir usuário no Supabase Auth com ESSA senha
    //    Se já existir, atualiza senha. Se não existir, cria.

    // 4.1 – listar usuários e tentar achar pelo e-mail
    const { data: listData, error: listError } =
      await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("Erro ao listar users no Auth:", listError)
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 }
      )
    }

    const existingAuthUser =
      listData?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      ) ?? null

    if (existingAuthUser) {
      // Usuário já existe no Auth → atualiza senha
      const { error: updateAuthError } =
        await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          password,
        })

      if (updateAuthError) {
        console.error("Erro ao atualizar senha no Auth:", updateAuthError)
        return NextResponse.json(
          { ok: false, error: "auth_update_failed" },
          { status: 500 }
        )
      }
    } else {
      // Usuário não existe no Auth → cria com essa senha
      const { error: createAuthError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      })

      if (createAuthError) {
        console.error("Erro ao criar user no Auth:", createAuthError)
        return NextResponse.json(
          { ok: false, error: "auth_create_failed" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, version: "primeiro-acesso-v3" })
  } catch (err) {
    console.error("Erro inesperado em /api/primeiro-acesso:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    )
  }
}
