"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";

type ShopData = {
  displays: { slot: number; cardType: string | null; cost: number; effect: string; remaining: number }[];
  cards: { type: string; cost: number; remaining: number }[];
};

export function ShopView() {
  const { snap } = useSnapshot(3000);
  const { data, mutate: mutateShop } = useSWR<ShopData>("/api/shop", fetcher, { refreshInterval: 3000 });
  const [team, setTeam] = useState<number | "">("");

  if (!snap || !data) return <p className="text-sm text-slate-400">載入中…</p>;
  const cur = snap.teams.find((t) => t.id === team);

  return (
    <div className="space-y-4">
      <Card title="購買對象">
        <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
        {cur && <span className="ml-3 text-sm text-slate-400">卡牌點數 <Num className="text-cyan-300">{cur.cardPoints}</Num></span>}
      </Card>

      <Card title="展示中（3 張，售出後自動補）">
        <div className="grid grid-cols-3 gap-3">
          {data.displays.map((d) => (
            <div key={d.slot} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-base font-bold text-cyan-200">{d.cardType ?? "（空）"}</div>
              <div className="mt-1 h-8 text-xs text-slate-400">{d.effect}</div>
              <div className="my-2 text-sm text-slate-300">點數 <Num className="font-bold text-cyan-300">{d.cost}</Num>　庫存 <Num>{d.remaining}</Num></div>
              <ActionButton label="售出" className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={team === "" || !d.cardType || d.remaining <= 0}
                onAction={async () => {
                  const r = await postJson("/api/shop/sell", { teamId: team, slot: d.slot });
                  await mutateShop();
                  return `售出 ${r.card}（-${r.cost} 點）`;
                }} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="功能卡兌換券">
        <ActionButton label="抽一張（兌換券）" className="bg-sky-600 text-white hover:bg-sky-500"
          disabled={team === ""}
          onAction={async () => {
            const r = await postJson("/api/shop/voucher", { teamId: team });
            await mutateShop();
            return `抽到 ${r.card}`;
          }} />
        <p className="mt-2 text-xs text-slate-500">小隊持功能卡兌換券時使用，免扣點數，抽一張並回收券。</p>
      </Card>

      <Card title="庫存總覽">
        <ul className="grid grid-cols-2 gap-x-6 text-sm">
          {data.cards.map((c) => (
            <li key={c.type} className="flex justify-between border-b border-white/10 py-1">
              <span>{c.type}</span>
              <span className="text-slate-400">點數 {c.cost}・剩 {c.remaining}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
