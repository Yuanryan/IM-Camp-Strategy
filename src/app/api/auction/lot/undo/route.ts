import { apiRoute, num } from "@/lib/api";
import { undoHammer } from "@/lib/service";

// 撤銷落槌：退款、收回交付物、退回 LIVE（限本站、時限內；ADMIN 不限站）
export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  undoHammer({
    lotId: num(body, "lotId"),
    byToken: session.label,
    isAdmin: session.role === "ADMIN",
  }),
);
