import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { ROLE_HOME, type Role } from "./game";

export const SESSION_COOKIE = "session";
// 執行期切換 authDisabled 時，連同這個「非 httpOnly」cookie 一起寫，
// 讓 middleware（proxy.ts）能同步判斷而不必每次連 DB（見 proxy.ts / api/admin/auth-toggle）。
export const AUTH_OFF_COOKIE = "auth_off";

// 開發用：設環境變數 AUTH_DISABLED=1 即可跳過所有登入 / 權限檢查。
// ⚠️ 正式上線（Vercel）千萬不要設這個。
// 這是「開機就生效」的逃生門；另有執行期可由 Admin 切換的 DB 旗標（見 authOff()）。
export const AUTH_OFF_ENV =
  process.env.AUTH_DISABLED === "1" || process.env.AUTH_DISABLED === "true";

// 真正判斷是否停用驗證：env 旗標 OR DB 執行期旗標（GameState.authDisabled）。
// 任何 server 端授權邏輯都應 await 這個，而不是只看 env。
export async function authOff(): Promise<boolean> {
  if (AUTH_OFF_ENV) return true;
  const state = await prisma.gameState.findUnique({
    where: { id: 1 },
    select: { authDisabled: true },
  });
  return state?.authDisabled ?? false;
}

// 開發用：設環境變數 DEV_LOGIN_BUTTONS=1，首頁的角色清單會變成「一鍵登入」按鈕，
// 不必掃 QR 即可用該角色身分登入（透過 /api/login?role=<ROLE> 撈該角色的 token）。
// ⚠️ 正式上線（Vercel）千萬不要設這個——等於對外開放所有角色入口。
export const DEV_LOGIN =
  process.env.DEV_LOGIN_BUTTONS === "1" || process.env.DEV_LOGIN_BUTTONS === "true";

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
  if (await authOff()) return devSession("ADMIN");
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

// 各關主站（HOST / EXCHANGE / MAP / MOBILE / CARDSHOP / AUCTION）彼此「不再互相驗證」：
// 任一關主登入後即可進出任何關主站。仍保留：必須登入、ADMIN 全通、TEAM 與關主互不越界。
// 判斷邏輯：required 全為關主站角色 → 任何關主站角色皆放行；含 TEAM 才照原本嚴格比對。
const STAFF_ROLES: readonly Role[] = ["HOST", "EXCHANGE", "MAP", "MOBILE", "CARDSHOP", "AUCTION"];
const isStaff = (role: Role) => STAFF_ROLES.includes(role);
function roleAllowed(sessionRole: Role, roles: Role[]): boolean {
  if (sessionRole === "ADMIN") return true; // 總覽 / 調平衡，一律放行
  if (roles.length === 0) return true; // 未限定角色
  if (roles.includes(sessionRole)) return true; // 原本就符合
  // 站對站放行：要求的全是關主站角色、且本身也是關主站角色（排除 TEAM）。
  return isStaff(sessionRole) && roles.every(isStaff);
}

// 在頁面 / route handler 中強制要求特定角色。
// 未登入 → 導向登入提示；角色不符 → 導回自己的首頁。
export async function requireRole(...roles: Role[]): Promise<Session> {
  if (await authOff()) {
    const role = (roles[0] ?? "ADMIN") as Role;
    if (role === "TEAM") {
      const t = await prisma.team.findFirst({ orderBy: { id: "asc" } });
      return devSession("TEAM", t?.id ?? null);
    }
    return devSession(role);
  }
  const session = await getSession();
  if (!session) redirect("/");
  if (!roleAllowed(session.role, roles)) {
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
  if (await authOff()) {
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
  // ADMIN 全通；各關主站彼此放行（見 roleAllowed），TEAM 仍嚴格比對。
  if (!roleAllowed(session.role, roles)) {
    throw new AuthError(403, "權限不足");
  }
  return session;
}
