import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireRoleApi, AUTH_OFF_COOKIE } from "@/lib/auth";

// POST /api/admin/auth-toggle  body: { enabled: boolean }
// ADMIN 專用：執行期切換「停用驗證」。寫 GameState.authDisabled（server 授權邏輯的真實來源），
// 同時寫 / 清 auth_off cookie，讓 middleware（proxy.ts）能同步判斷而不必每次連 DB。
//
// ⚠️ enabled=true 等於對外完全不設防（無 cookie 訪客＝ADMIN）。僅供現場測試 / 救援。
export async function POST(req: NextRequest) {
  try {
    // 注意：若目前已是「停用驗證」狀態，requireRoleApi 會直接放行（這是預期行為——
    // 才能在已停用時把它關回來）；正常狀態則必須是 ADMIN 才能開啟。
    const session = await requireRoleApi(req, "ADMIN");

    const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
    const enabled = body.enabled === true || body.enabled === "true";

    await prisma.gameState.update({
      where: { id: 1 },
      data: { authDisabled: enabled },
    });

    const res = NextResponse.json({ ok: true, authDisabled: enabled, by: session.label });
    if (enabled) {
      res.cookies.set(AUTH_OFF_COOKIE, "1", {
        httpOnly: false, // middleware 與（必要時）client 皆可讀；本身不含機密
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    } else {
      res.cookies.delete(AUTH_OFF_COOKIE);
    }
    return res;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "發生錯誤";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
