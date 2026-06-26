import { apiRoute, num } from "@/lib/api";
import { grantGiftVoucher } from "@/lib/service";

// 好運卡「神秘禮物」：發一張「神秘商店五折券」（下一次商店購買動產 5 折）。
export const POST = apiRoute(["MAP"], async ({ body, session }) =>
  grantGiftVoucher({ teamId: num(body, "teamId"), byToken: session.label }),
);
