import QRCode from "qrcode";
import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/game";

// GET /api/admin/tokens — ADMIN 專用：列出所有角色 / 小隊的登入連結與 QR。
// 供 Admin 頁面「登入連結 / QR」卡片使用，現場可直接掃描登入，不必另外跑 seed。
// base URL 取自當前請求 origin，故 localhost 與 Vercel 皆可直接使用。
//
// ⚠️ 這會回傳可直接登入各角色（含 ADMIN）的 token，所以路由本身就鎖 ADMIN，
// 不要把回傳內容外流。
export const GET = apiRoute(["ADMIN"], async ({ req }) => {
  const base = req.nextUrl.origin;
  const roleOrder = new Map<string, number>(ROLES.map((r, i) => [r, i]));

  // 排除 ADMIN：自己已在 Admin 頁，沒必要再列出 Admin 登入連結，
  // 也避免最高權限的入口連結被一起投影 / 外流。
  const tokens = await prisma.accessToken.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { id: "asc" },
  });

  // 角色順序（HOST→…→TEAM）排序，同角色再依 id（即發放順序）。
  tokens.sort(
    (a, b) =>
      (roleOrder.get(a.role) ?? 99) - (roleOrder.get(b.role) ?? 99) || a.id - b.id,
  );

  const rows = await Promise.all(
    tokens.map(async (t) => {
      const url = `${base}/api/login?t=${t.token}`;
      return {
        id: t.id,
        role: t.role,
        roleLabel: ROLE_LABEL[t.role as Role] ?? t.role,
        label: t.label,
        teamId: t.teamId, // TEAM 列才有；停用驗證時用來組 /team?teamId= 直連
        url,
        qr: await QRCode.toDataURL(url, { width: 220, margin: 1 }),
      };
    }),
  );

  return { tokens: rows };
});
