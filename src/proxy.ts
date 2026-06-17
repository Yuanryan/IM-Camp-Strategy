import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, AUTH_OFF_COOKIE } from "@/lib/auth";

// 執行期 authDisabled 的極短 TTL 快取：避免每個受保護頁面導覽都打一次 DB。
// 切換生效後最多延遲 TTL 秒 middleware 才看到（頁面層 requireRole 仍即時正確，故安全）。
const FLAG_TTL_MS = 5_000;
let flagCache: { value: boolean; at: number } | null = null;
async function runtimeAuthOff(): Promise<boolean> {
  const now = Date.now();
  if (flagCache && now - flagCache.at < FLAG_TTL_MS) return flagCache.value;
  try {
    const state = await prisma.gameState.findUnique({
      where: { id: 1 },
      select: { authDisabled: true },
    });
    const value = state?.authDisabled ?? false;
    flagCache = { value, at: now };
    return value;
  } catch {
    // DB 讀取失敗時不要把所有人擋在外面也不要全開；回退成「未停用」交給頁面層處理。
    return flagCache?.value ?? false;
  }
}

// Next.js 16：middleware 改名為 proxy（nodejs runtime）。
// 這裡只做「樂觀檢查」：受保護路徑若無 session cookie 就導回登入提示頁。
// 真正的角色授權在各頁面 / route handler 以 requireRole(Api) 執行。
export async function proxy(request: NextRequest) {
  // 停用驗證時完全不擋。三個來源任一成立即放行：
  //   1) env 旗標（開機逃生門）
  //   2) 執行期 DB 旗標（Admin 切換，全域生效；TTL 快取）
  //   3) auth_off cookie（切換當下的 admin 瀏覽器即時生效，免等 TTL）
  const envOff = process.env.AUTH_DISABLED === "1" || process.env.AUTH_DISABLED === "true";
  const cookieOff = request.cookies.get(AUTH_OFF_COOKIE)?.value === "1";
  if (envOff || cookieOff || (await runtimeAuthOff())) {
    return NextResponse.next();
  }
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
    "/admin/:path*",
    "/team/:path*",
  ],
};
