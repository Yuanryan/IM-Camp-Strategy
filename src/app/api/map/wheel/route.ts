import { apiRoute, num } from "@/lib/api";
import { applyWheel } from "@/lib/service";
import { spinWheel } from "@/lib/game";

// 命運投資輪盤：伺服器擲倍率並結算
export const POST = apiRoute(["MAP"], async ({ body, session }) => {
  const stake = num(body, "stake");
  const mult = spinWheel();
  return applyWheel({ teamId: num(body, "teamId"), stake, mult, byToken: session.label });
});
