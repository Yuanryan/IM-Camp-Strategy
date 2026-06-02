"use client";

import { useSnapshot } from "@/components/client";
import { Card } from "@/components/Shell";

const LEVEL_TAG = ["已購", "1級", "2級", "3級"];

export function TeamView({ teamId }: { teamId: number }) {
  const { snap, error } = useSnapshot(3000);
  if (error) return <p className="text-sm text-zinc-500">連線錯誤，重試中…</p>;
  if (!snap) return <p className="text-sm text-zinc-500">載入中…</p>;

  const me = snap.teams.find((t) => t.id === teamId);
  const myProps = snap.properties.filter((p) => p.ownerTeamId === teamId);
  const myNumbers = snap.lottery.numbers.filter((n) => n.teamId === teamId);

  if (!me) return <p className="text-sm text-zinc-500">找不到隊伍資料</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-xs text-zinc-400">光幣</div>
          <div className="text-3xl font-black tabular-nums">{me.coins}</div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-400">卡牌點數</div>
          <div className="text-3xl font-black tabular-nums">{me.cardPoints}</div>
        </Card>
      </div>

      <Card title="目前總資產（含不動產現值，不含動產）">
        <div className="text-2xl font-black tabular-nums">{me.netWorth}</div>
        <div className="text-xs text-zinc-400">
          現金 {me.coins}　+　不動產現值 {me.propertyValue}（{me.propertyCount} 筆）
        </div>
      </Card>

      <Card title={`持有不動產（${myProps.length}）`}>
        {myProps.length === 0 ? (
          <p className="text-sm text-zinc-400">尚無不動產</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {myProps.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {p.name}
                  <span className="ml-2 text-xs text-zinc-400">{p.regionName}・{p.type}</span>
                </span>
                <span className="text-right">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{LEVEL_TAG[p.level]}</span>
                  <span className="ml-2 font-bold tabular-nums">{p.currentValue}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`大樂透號碼（第 ${snap.lottery.period} 期）`}>
        {myNumbers.length === 0 ? (
          <p className="text-sm text-zinc-400">尚未登記號碼</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {myNumbers.map((n) => (
              <span key={n.number} className="rounded-md bg-emerald-100 px-2 py-1 text-sm font-bold tabular-nums text-emerald-700">
                {n.number}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
