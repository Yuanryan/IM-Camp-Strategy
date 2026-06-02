import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Next.js 16：middleware 改名為 proxy（nodejs runtime）。
// 這裡只做「樂觀檢查」：受保護路徑若無 session cookie 就導回登入提示頁。
// 真正的角色授權在各頁面 / route handler 以 requireRole(Api) 執行。
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("need", "login");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/host/:path*",
    "/exchange/:path*",
    "/map/:path*",
    "/mobile/:path*",
    "/shop/:path*",
    "/lottery/:path*",
    "/admin/:path*",
    "/team/:path*",
  ],
};
