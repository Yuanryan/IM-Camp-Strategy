import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { ROLE_HOME, type Role } from "./game";

export const SESSION_COOKIE = "session";

// 開發用：設環境變數 AUTH_DISABLED=1 即可跳過所有登入 / 權限檢查。
// ⚠️ 正式上線（Vercel）千萬不要設這個。
export const AUTH_OFF =
  process.env.AUTH_DISABLED === "1" || process.env.AUTH_DISABLED === "true";

export type Session = {
  tokenId: number;
  token: string;
  role: Role;
  label: string;
  teamId: number | null;
};

const devSession = (role: Role, teamId: number | null = null): Session => ({
  tokenId: 0,
  token: "dev",
  role,
  label: "DEV",
  teamId,
});

// 從 cookie 讀出目前登入身分（無則回 null）
export async function getSession(): Promise<Session | null> {
  if (AUTH_OFF) return devSession("ADMIN");
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await prisma.accessToken.findUnique({ where: { token } });
  if (!row) return null;
  return {
    tokenId: row.id,
    token: row.token,
    role: row.role as Role,
    label: row.label,
    teamId: row.teamId,
  };
}

// 在頁面 / route handler 中強制要求特定角色。
// 未登入 → 導向登入提示；角色不符 → 導回自己的首頁。
export async function requireRole(...roles: Role[]): Promise<Session> {
  if (AUTH_OFF) {
    const role = (roles[0] ?? "ADMIN") as Role;
    if (role === "TEAM") {
      const t = await prisma.team.findFirst({ orderBy: { id: "asc" } });
      return devSession("TEAM", t?.id ?? null);
    }
    return devSession(role);
  }
  const session = await getSession();
  if (!session) redirect("/");
  if (roles.length && !roles.includes(session.role)) {
    redirect(ROLE_HOME[session.role]);
  }
  return session;
}

// 給 route handler 用：回傳 session 或丟出 401/403（不做 redirect）
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// req 只在 AUTH_OFF 時用來讀 ?teamId= dev 參數，prod 傳 null 即可。
export async function requireRoleApi(req: NextRequest | null, ...roles: Role[]): Promise<Session> {
  if (AUTH_OFF) {
    const role = (roles[0] ?? "ADMIN") as Role;
    if (role === "TEAM") {
      // Dev: 先從 ?teamId= 讀，讀不到才 fallback 到第一隊
      const paramId = req ? parseInt(req.nextUrl.searchParams.get("teamId") ?? "", 10) : NaN;
      const teamId = Number.isFinite(paramId)
        ? paramId
        : ((await prisma.team.findFirst({ orderBy: { id: "asc" } }))?.id ?? null);
      return devSession("TEAM", teamId);
    }
    return devSession(role);
  }
  const session = await getSession();
  if (!session) throw new AuthError(401, "未登入");
  // ADMIN 永遠可通過（總覽 / 調平衡）
  if (session.role !== "ADMIN" && roles.length && !roles.includes(session.role)) {
    throw new AuthError(403, "權限不足");
  }
  return session;
}
