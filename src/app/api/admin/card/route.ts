import { apiRoute, str } from "@/lib/api";
import { adminSetCard } from "@/lib/service";
import { prisma } from "@/lib/db";

export const GET = apiRoute(["ADMIN", "CARDSHOP"], async () =>
  prisma.functionCard.findMany({ orderBy: { id: "asc" } }),
);

export const POST = apiRoute(["ADMIN"], async ({ body }) =>
  adminSetCard({
    type: str(body, "type"),
    cost: body.cost != null ? Number(body.cost) : undefined,
    remaining: body.remaining != null ? Number(body.remaining) : undefined,
  }),
);
