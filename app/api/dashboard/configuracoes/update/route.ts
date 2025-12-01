import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getDB() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, meu_nome, tone, default_color } = await req.json()

    if (!email) {
      return NextResponse.json({ ok: false, error: "email ausente" }, { status: 400 })
    }

    const supabase = getDB()

    // 1) Busca o usuário pelo e-mail
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (userError) {
      console.error("[CONFIG UPDATE] Erro ao buscar usuário:", userError)
      return NextResponse.json({ ok: false, error: userError.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // 2) Upsert das configs
    const { error: upsertError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        meu_nome,
        tone,
        default_color,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.error("[CONFIG UPDATE] Erro ao salvar user_settings:", upsertError)
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[CONFIG UPDATE FATAL]", err)
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 })
  }
}