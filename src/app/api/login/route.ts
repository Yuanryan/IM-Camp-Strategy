import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, DEV_LOGIN } from "@/lib/auth";
import { ROLE_HOME, ROLES, type Role } from "@/lib/game";

// QR / 連結登入：GET /api/login?t=<token>
// 驗證 token → 寫 httpOnly cookie（12 小時）→ 導向該角色首頁
//
// 開發捷徑：GET /api/login?role=<ROLE>（僅在 DEV_LOGIN_BUTTONS 開啟時可用）
// 直接撈該角色的 token 登入，供首頁的「一鍵登入」按鈕使用，不必掃 QR。
export async function GET(request: NextRequest) {
  const base = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  // 用既有 token 登入（正式管道）
  let token = params.get("t");

  // 用角色登入（開發捷徑；旗標關閉時忽略 role 參數）
  if (!token && DEV_LOGIN) {
    const role = params.get("role");
    if (role && (ROLES as readonly string[]).includes(role)) {
      const row = await prisma.accessToken.findFirst({ where: { role } });
      token = row?.token ?? null;
    }
  }

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
