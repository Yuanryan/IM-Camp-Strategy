import { apiRoute, num } from "@/lib/api";
import { adminSetShopItem } from "@/lib/service";
import { prisma } from "@/lib/db";

// 神秘商店動產定價 / 上架管理（admin）。GET 回全部模板（含未上架）。
export const GET = apiRoute(["ADMIN", "CARDSHOP"], async () =>
  prisma.movableAsset.findMany({ orderBy: [{ grade: "asc" }, { name: "asc" }] }),
);

export const POST = apiRoute(["ADMIN"], async ({ body }) =>
  adminSetShopItem({
    assetId: num(body, "assetId"),
    price: body.price != null ? Number(body.price) : undefined,
    shopStock: body.shopStock != null ? Number(body.shopStock) : undefined,
  }),
);
