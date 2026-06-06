import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

// List all MovableAsset templates — accessible by grantors and admin.
export const GET = apiRoute(["EXCHANGE", "MOBILE", "ADMIN"], async () =>
  prisma.movableAsset.findMany({ orderBy: [{ grade: "asc" }, { name: "asc" }] }),
);
