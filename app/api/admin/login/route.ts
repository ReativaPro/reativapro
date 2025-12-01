import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      console.error("[ADMIN LOGIN] Variáveis ADMIN_EMAIL/ADMIN_PASSWORD não configuradas.")
      return NextResponse.json(
        { ok: false, error: "Configuração de admin ausente." },
        { status: 500 }
      )
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas." },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[ADMIN LOGIN FATAL]", err)
    return NextResponse.json(
      { ok: false, error: "Erro interno no login admin." },
      { status: 500 }
    )
  }
}