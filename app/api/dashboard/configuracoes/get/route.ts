import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getDB() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ ok: false, error: "email faltando" }, { status: 400 })
  }

  const supabase = getDB()

  // 1) Descobre o user_id pelo e-mail
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (userError) {
    console.error("[CONFIG GET] Erro ao buscar usuário:", userError)
    return NextResponse.json({ ok: false, error: userError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 })
  }

  // 2) Busca as configs
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (settingsError) {
    console.error("[CONFIG GET] Erro ao buscar user_settings:", settingsError)
    return NextResponse.json({ ok: false, error: settingsError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    settings: settings || null,
  })
}