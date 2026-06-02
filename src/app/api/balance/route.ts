import { apiRoute, num, optNum } from "@/lib/api";
import { adjustBalance } from "@/lib/service";

// 獎勵 / 懲罰 / 燈塔 / 契約等光幣・卡牌點數加減
export const POST = apiRoute(["EXCHANGE", "MAP", "MOBILE", "HOST"], async ({ body, session }) =>
  adjustBalance({
    teamId: num(body, "teamId"),
    coins: optNum(body, "coins", 0),
    cardPoints: optNum(body, "cardPoints", 0),
    kind: typeof body.kind === "string" ? (body.kind as string) : "coins",
    note: typeof body.note === "string" ? (body.note as string) : undefined,
    byToken: session.label,
  }),
);
