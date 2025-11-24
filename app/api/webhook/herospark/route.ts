import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const secret = process.env.HEROSPARK_WEBHOOK_SECRET
  const receivedSecret = req.headers.get("x-herospark-secret")

  // Segurança: só aceita se o segredo bater
  if (!secret || receivedSecret !== secret) {
    console.log("Webhook recusado: segredo inválido")
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  // Lê o corpo do webhook
  const body = await req.json()

  console.log("Webhook recebido da HeroSpark:", body)

  // Por enquanto, só confirma que recebeu
  return NextResponse.json({ ok: true })
}
