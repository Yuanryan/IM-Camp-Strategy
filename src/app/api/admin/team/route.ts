import { apiRoute, num } from "@/lib/api";
import { adminSetTeam } from "@/lib/service";

export const POST = apiRoute(["ADMIN"], async ({ body, session }) =>
  adminSetTeam({
    teamId: num(body, "teamId"),
    name: typeof body.name === "string" ? (body.name as string) : undefined,
    coins: body.coins != null ? num(body, "coins") : undefined,
    cardPoints: body.cardPoints != null ? num(body, "cardPoints") : undefined,
    byToken: session.label,
  }),
);
