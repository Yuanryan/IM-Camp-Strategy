import { apiRoute } from "@/lib/api";
import { getSnapshot } from "@/lib/snapshot";

// 目前排名（不鎖定），給投影 / 主持人預覽
export const GET = apiRoute([], async () => {
  const snap = await getSnapshot();
  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  return { phase: snap.phase, ranking };
});
