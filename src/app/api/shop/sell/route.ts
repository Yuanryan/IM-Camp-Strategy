import { apiRoute, num, str, optBool } from "@/lib/api";
import { sellCard } from "@/lib/service";

export const POST = apiRoute(["CARDSHOP"], async ({ body, session }) =>
  sellCard({ teamId: num(body, "teamId"), cardType: str(body, "cardType"), limited: optBool(body, "limited"), byToken: session.label }),
);
