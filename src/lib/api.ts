import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthError, requireRoleApi, type Session } from "./auth";
import type { Role } from "./game";

type Handler = (
  ctx: { req: NextRequest; session: Session; body: Record<string, unknown> },
) => Promise<unknown>;

// 包一層：自動做 RBAC、解析 body、統一錯誤格式。ADMIN 一律放行（見 requireRoleApi）。
export function apiRoute(roles: Role[], handler: Handler) {
  return async (req: NextRequest) => {
    try {
      const session = await requireRoleApi(...roles);
      let body: Record<string, unknown> = {};
      if (req.method !== "GET") {
        body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      }
      const data = await handler({ req, session, body });
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      const message = e instanceof Error ? e.message : "發生錯誤";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  };
}

// 小工具：從 body 取數字 / 字串
export function num(body: Record<string, unknown>, key: string): number {
  const v = body[key];
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (Number.isNaN(n)) throw new Error(`參數 ${key} 需為數字`);
  return n;
}
export function optNum(body: Record<string, unknown>, key: string, def = 0): number {
  if (body[key] == null || body[key] === "") return def;
  return num(body, key);
}
export function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== "string" || !v) throw new Error(`參數 ${key} 必填`);
  return v;
}
