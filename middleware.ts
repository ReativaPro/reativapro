import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isAdmin = pathname.startsWith("/admin")
  const isApi = pathname.startsWith("/api")
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/primeiro-acesso") ||
    pathname.startsWith("/assinatura-expirada") ||
    pathname.startsWith("/pagamento-aprovado")

  if (isApi || isPublic) {
    return NextResponse.next()
  }

  const sessionEmail = req.cookies.get("session_email")?.value

  // ========== BLOQUEIO DO DASHBOARD ==========
  if (isDashboard) {
    if (!sessionEmail) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", sessionEmail)
      .maybeSingle()

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!subscription) {
      return NextResponse.redirect(new URL("/assinatura-expirada", req.url))
    }

    const expired =
      subscription.status !== "active" ||
      new Date(subscription.expires_at) < new Date()

    if (expired) {
      return NextResponse.redirect(new URL("/assinatura-expirada", req.url))
    }

    return NextResponse.next()
  }

  // ========== BLOQUEIO DO ADMIN ==========
  if (isAdmin) {
    const adminSession = req.cookies.get("admin_session")?.value

    if (!adminSession || adminSession !== "true") {
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*"
  ]
}