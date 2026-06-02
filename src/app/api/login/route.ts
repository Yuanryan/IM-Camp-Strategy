import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { ROLE_HOME, type Role } from "@/lib/game";

// QR / 連結登入：GET /api/login?t=<token>
// 驗證 token → 寫 httpOnly cookie（12 小時）→ 導向該角色首頁
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  const base = request.nextUrl.origin;
  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing", base));
  }
  const row = await prisma.accessToken.findUnique({ where: { token } });
  if (!row) {
    return NextResponse.redirect(new URL("/?error=invalid", base));
  }
  const home = ROLE_HOME[row.role as Role] ?? "/";
  const res = NextResponse.redirect(new URL(home, base));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 小時，涵蓋整場活動
  });
  return res;
}
