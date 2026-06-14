"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { fetcher, useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num } from "@/components/ui";

type ShopCard = { type: string; cost: number; effect: string; remaining: number };
type ShopData = { cards: ShopCard[] };

// 從還有庫存的卡去重隨機抽 n 張（Fisher–Yates）
function drawDisplay(cards: ShopCard[], n = 3): string[] {
  const pool = cards.filter((c) => c.remaining > 0);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((c) => c.type);
}

// 每隊的 3 張展示鎖在 localStorage，避免「重進商店重抽」。
// key 依隊伍 id；買一張後清掉該隊，下次進來才重抽。
const drawKey = (teamId: number) => `shopDraw:${teamId}`;
function loadDraw(teamId: number): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(drawKey(teamId));
    const arr = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(arr) && arr.every((x) => typeof x === "string") ? (arr as string[]) : null;
  } catch {
    return null;
  }
}
function saveDraw(teamId: number, types: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(drawKey(teamId), JSON.stringify(types));
  } catch {
    /* 容量 / 隱私模式失敗時靜默忽略 */
  }
}
function clearDraw(teamId: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(drawKey(teamId));
  } catch {
    /* ignore */
  }
}

// 發牌動畫：卡片從牌堆飛入（依序），落定後從牌背翻面露出正面。dealKey 變動即重播。
function DealtCard({ index, dealKey, children }: { index: number; dealKey: number; children: React.ReactNode }) {
  const dealDelay = index * 0.18; // 依序發牌
  const flipDelay = dealDelay + 0.28; // 飛到位後才翻面
  return (
    <div style={{ perspective: 1000 }}>
      {/* 外層：發牌位移 + 淡入 */}
      <motion.div
        key={dealKey}
        initial={{ x: -50 * (index + 1) - 40, y: -70, opacity: 0, scale: 0.85 }}
        animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{
          x: { type: "spring", stiffness: 260, damping: 24, delay: dealDelay },
          y: { type: "spring", stiffness: 260, damping: 24, delay: dealDelay },
          scale: { type: "spring", stiffness: 260, damping: 20, delay: dealDelay },
          opacity: { duration: 0.2, delay: dealDelay },
        }}
      >
        {/* 內層：3D 翻面，正面 rotateY 180→0；牌背反向 */}
        <motion.div
          className="relative"
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ rotateY: { duration: 0.5, ease: "easeOut", delay: flipDelay } }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* 牌背 */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-900/40 to-slate-900/60"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-3xl opacity-50">✦</div>
          </div>
          {/* 牌面 */}
          <div style={{ backfaceVisibility: "hidden" }}>{children}</div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function ShopView() {
  const { snap } = useSnapshot(3000);
  const { data, mutate: mutateShop } = useSWR<ShopData>("/api/shop", fetcher, { refreshInterval: 3000 });
  const [team, setTeam] = useState<number | "">("");
  // 展示的 3 張：每隊鎖在 localStorage，只存「卡種類」，成本 / 庫存即時從 data.cards 對照
  const [displayTypes, setDisplayTypes] = useState<string[]>([]);
  const [dealKey, setDealKey] = useState(0); // 每次抽牌 +1，重播發牌動畫
  const resolvedFor = useRef<number | null>(null); // 已為哪一隊解出展示（避免庫存輪詢時重抽）

  const cards = data?.cards;

  // 強制重抽（關主手動「重抽三張」按鈕）：覆寫該隊的鎖定
  const reshuffle = useCallback(() => {
    if (cards && team !== "") {
      const next = drawDisplay(cards);
      saveDraw(team, next);
      setDisplayTypes(next);
      setDealKey((k) => k + 1);
    }
  }, [cards, team]);

  // 切換隊伍時：有鎖定就沿用（重進不重抽），沒有才抽一次並鎖定。
  // resolvedFor 確保每隊只解一次；庫存輪詢（cards 變動）不會觸發重抽。
  useEffect(() => {
    if (team === "") {
      resolvedFor.current = null;
      setDisplayTypes([]);
      return;
    }
    if (!cards || resolvedFor.current === team) return;
    const saved = loadDraw(team);
    const next = saved ?? drawDisplay(cards);
    if (!saved) saveDraw(team, next);
    resolvedFor.current = team;
    setDisplayTypes(next);
    setDealKey((k) => k + 1);
  }, [team, cards]);

  if (!snap || !data) return <p className="text-sm text-slate-400">載入中…</p>;
  const cur = snap.teams.find((t) => t.id === team);
  const byType = new Map(data.cards.map((c) => [c.type, c]));

  return (
    <div className="space-y-4">
      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
          {cur ? (
            <span className="text-sm text-slate-400">
              卡牌點數 <Num className="font-bold text-cyan-300">{cur.cardPoints}</Num>
            </span>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇購買小隊</span>
          )}
        </div>
      </StickyTeam>

      <Card title="展示中（3 張・每隊固定，買一張後重抽）">
        <div className="mb-3 flex items-center justify-between gap-3">
          <ActionButton label="重抽三張" className="chip shrink-0" disabled={team === ""} onAction={async () => { reshuffle(); }} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {displayTypes.map((type, i) => {
            const c = byType.get(type);
            const soldOut = !c || c.remaining <= 0;
            const cantAfford = !!c && team !== "" && (cur?.cardPoints ?? 0) < c.cost;
            return (
              <DealtCard key={`${type}-${i}`} index={i} dealKey={dealKey}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-base font-bold text-cyan-200">{c?.type ?? "（空）"}</div>
                  <div className="mt-1 h-8 text-xs text-slate-400">{c?.effect ?? ""}</div>
                  <div className="my-2 text-sm text-slate-300">點數 <Num className="font-bold text-cyan-300">{c?.cost ?? 0}</Num>　庫存 <Num>{c?.remaining ?? 0}</Num></div>
                  <ActionButton
                    label={soldOut ? "已售完" : cantAfford ? `點數不足（- ${c.cost - (cur?.cardPoints ?? 0)}）` : "購買"}
                    className="w-full btn-emerald"
                    disabled={team === "" || soldOut || cantAfford}
                    onAction={async () => {
                      const r = await postJson("/api/shop/sell", { teamId: team, cardType: type });
                      await mutateShop();
                      // 買一張 → 清掉該隊鎖定並重抽（下次進來才不是同一組）
                      if (team !== "") {
                        clearDraw(team);
                        resolvedFor.current = null;
                      }
                      return `售出 ${r.card}（-${r.cost} 點）`;
                    }} />
                </div>
              </DealtCard>
            );
          })}
        </div>
      </Card>

      <Card title="庫存總覽">
        <ul className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
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
