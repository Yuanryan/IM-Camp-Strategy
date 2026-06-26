import { apiRoute, num } from "@/lib/api";
import { applyFreeWheel } from "@/lib/service";

// 好運卡「命運眷顧」：免費轉一次輪盤（名目投入，淨入帳 ≥0）。
export const POST = apiRoute(["MAP"], async ({ body, session }) =>
  applyFreeWheel({ teamId: num(body, "teamId"), byToken: session.label }),
);
