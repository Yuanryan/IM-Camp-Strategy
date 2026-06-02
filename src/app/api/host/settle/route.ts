import { apiRoute } from "@/lib/api";
import { settle } from "@/lib/service";
import { getSnapshot } from "@/lib/snapshot";

// 結算：鎖定為 SETTLED，並回傳依淨資產排序的排名
export const POST = apiRoute(["HOST"], async () => {
  await settle();
  const snap = await getSnapshot();
  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  return { ok: true, ranking };
});
