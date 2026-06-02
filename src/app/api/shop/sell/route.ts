import { apiRoute, num } from "@/lib/api";
import { sellCard } from "@/lib/service";

export const POST = apiRoute(["CARDSHOP"], async ({ body, session }) =>
  sellCard({ teamId: num(body, "teamId"), slot: num(body, "slot"), byToken: session.label }),
);
