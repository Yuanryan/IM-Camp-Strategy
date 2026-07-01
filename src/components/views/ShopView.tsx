"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import Image from "next/image";
import { CreditCard, Package } from "lucide-react";
import { fetcher, useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, HudTabs, TurnCompleteBar } from "@/components/ui";
import { ITEM_GRADE_COLORS, EffectType, functionCardImage, reshuffleCost } from "@/lib/game";

type ShopCard = { type: string; cost: number; effect: string; remaining: number };
type ShopData = { cards: ShopCard[] };

type ShopItem = {
  id: number;
  name: string;
  grade: string;
  effectType: string;
  description: string;
  price: number;
  shopStock: number;
};
type ShopItemData = { items: ShopItem[] };

// 動產展示稀有度權重：B 最常見、A 次之、S 最稀有（數字＝相對被抽中的機率比）
const GRADE_DRAW_WEIGHT: Record<string, number> = { S: 1, A: 3, B: 8 };

// 從還有庫存的項目去重隨機抽 n 個，回傳各項的 key（卡=type / 動產=id）。
// 有給 weightOf → 依權重抽（不放回，稀有的較難被抽中）；沒給 → 均勻（Fisher–Yates）。
function drawDisplay<T>(pool: T[], keyOf: (x: T) => string, n = 3, weightOf?: (x: T) => number): string[] {
  const xs = pool.slice();
  if (!weightOf) {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs.slice(0, n).map(keyOf);
  }
  // 加權不放回抽樣：每次依剩餘項的權重比例挑一個，挑中即移除
  const weights = xs.map((x) => Math.max(0, weightOf(x)));
  const picked: string[] = [];
  for (let k = 0; k < n && xs.length > 0; k++) {
    let total = weights.reduce((s, w) => s + w, 0);
    let idx = xs.length - 1; // total=0（理論上不會）時的退路：取最後一個
    if (total > 0) {
      let r = Math.random() * total;
      for (let i = 0; i < xs.length; i++) {
        r -= weights[i];
        if (r < 0) { idx = i; break; }
      }
    }
    picked.push(keyOf(xs[idx]));
    xs.splice(idx, 1);
    weights.splice(idx, 1);
  }
  return picked;
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

// 「展示中」卡片標題：限購模式時右上角掛一顆「限購一件 / 已用完」小徽章（取代原本獨立 Card 橫幅）。
function ShopDisplayTitle({ label, limited, locked }: { label: string; limited: boolean; locked: boolean }) {
  return (
    <span className="flex flex-1 items-center justify-between gap-2">
      <span>{label}</span>
      {limited && (
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${
            locked
              ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
              : "border-amber-400/50 bg-amber-400/15 text-amber-200"
          }`}
        >
          {locked ? "限購已用完" : "過起點・限購一件"}
        </span>
      )}
    </span>
  );
}

// 展示 3 個共用邏輯：每次「進商店」（選定 / 切換小隊）就重抽一組全新的 3 個，不跨次保留。
// 庫存輪詢（pool 變動）不重抽——resolvedFor 確保每隊只在首次解析時抽一次；redraw() 供關主付費重抽 / 買後重抽手動觸發。
function useShopDisplay<T>(
  team: number | "",
  pool: T[] | undefined,
  keyOf: (x: T) => string,
  weightOf?: (x: T) => number,
) {
  const [keys, setKeys] = useState<string[]>([]);
  const [dealKey, setDealKey] = useState(0); // 每次抽牌 +1，重播發牌動畫
  const resolvedFor = useRef<number | null>(null); // 已為哪一隊抽過（避免庫存輪詢時重抽）

  // 手動重抽（付費重抽 / 買後重抽）：即時抽一組新的並重播動畫。
  const redraw = useCallback(() => {
    if (pool && team !== "") {
      setKeys(drawDisplay(pool, keyOf, 3, weightOf));
      setDealKey((k) => k + 1);
    }
  }, [pool, team, keyOf, weightOf]);

  // 進商店 / 切換小隊：抽一組全新的 3 個（每隊只在首次解析時抽，庫存輪詢不重抽）。
  useEffect(() => {
    if (team === "") {
      resolvedFor.current = null;
      setKeys([]);
      return;
    }
    if (!pool || resolvedFor.current === team) return;
    resolvedFor.current = team;
    setKeys(drawDisplay(pool, keyOf, 3, weightOf));
    setDealKey((k) => k + 1);
  }, [team, pool, keyOf, weightOf]);

  return { keys, dealKey, redraw };
}

const cardKey = (c: ShopCard) => c.type;
// 展示抽卡機率 = 該卡流通數 / 流通卡牌總數：直接用 remaining 當權重即可（drawDisplay 的加權演算法逐次依剩餘權重比例抽）。
const cardWeight = (c: ShopCard) => c.remaining;
const itemKey = (it: ShopItem) => String(it.id);
const itemWeight = (it: ShopItem) => GRADE_DRAW_WEIGHT[it.grade] ?? 1;

export function ShopView({
  team: teamProp,
  setTeam: setTeamProp,
  turnMode = false,
  freeMode = false,
  limited = false,
  onComplete,
}: {
  team?: number | "";
  setTeam?: (id: number | "") => void;
  // 地圖回合操作：顯示「完成」鈕，累計本回合動產購買支出（負值）並回報。
  // 卡片以卡牌點數購買、非光幣，不計入回合金流。
  turnMode?: boolean;
  // 好運卡「神秘禮物」免費抽動產：頂部出現一鍵「免費抽動產」面板（依等級加權隨機、免費），抽一次後鎖。
  freeMode?: boolean;
  // 過起點限購模式：本回合限買一件（卡或動產擇一），買前消耗 passGoShopCredit；買完 / 無額度即鎖。
  limited?: boolean;
  // delta＝本回合此處光幣淨變動；extra.cardPoints＝本回合此處卡牌點數支出（負值），併入地圖階段 2 結算。
  // 簽名對齊共用 completeTurnAction(delta, subRows?, extra?)——ShopView 不用 subRows，傳 undefined。
  onComplete?: (delta: number, subRows?: { label: string; amount: number }[], extra?: { cardPoints?: number }) => void;
} = {}) {
  // 受控（由 MapView 共用 team）或自管（/shop 獨立頁）
  const [teamInner, setTeamInner] = useState<number | "">("");
  const team = teamProp ?? teamInner;
  const setTeam = setTeamProp ?? setTeamInner;
  const [tab, setTab] = useState<"cards" | "assets">(freeMode ? "assets" : "cards");
  // 本回合累計動產購買支出（光幣，負值）；按「完成」時併入地圖階段 2。
  const [turnDelta, setTurnDelta] = useState(0);
  // 本回合累計功能卡購買支出（卡牌點數，負值）；同樣併入地圖階段 2 結算列。
  const [turnPoints, setTurnPoints] = useState(0);
  // 本次進商店已重抽次數（前端鏡射；enterShop 歸 0）：用來即時顯示下一次重抽成本。
  const [cardShuffles, setCardShuffles] = useState(0);
  const [itemShuffles, setItemShuffles] = useState(0);
  const { snap, mutate: mutateSnap } = useSnapshot(3000);
  // 只輪詢目前 tab 的庫存（另一個 tab 暫停＝refreshInterval 0），減少不必要的 API 呼叫。
  // 切回該 tab 時 SWR 仍會立即重新驗證一次（revalidateOnMount/focus），不會看到過期庫存。
  const { data, mutate: mutateShop } = useSWR<ShopData>("/api/shop", fetcher, { refreshInterval: tab === "cards" ? 3000 : 0 });
  const { data: itemData, mutate: mutateItems } = useSWR<ShopItemData>("/api/shop/item", fetcher, { refreshInterval: tab === "assets" ? 3000 : 0 });

  // 只展示「還有庫存」的項目，去重隨機抽 3 個（兩個 tab 各自一組）
  const cardPool = useMemo(() => data?.cards.filter((c) => c.remaining > 0), [data]);
  const itemPool = useMemo(() => itemData?.items.filter((it) => it.shopStock > 0), [itemData]);
  const cardDisplay = useShopDisplay(team, cardPool, cardKey, cardWeight);
  const itemDisplay = useShopDisplay(team, itemPool, itemKey, itemWeight);

  // 進商店（選定 / 切換小隊）：後端重置本次重抽次數，前端鏡射歸 0。
  useEffect(() => {
    if (team === "") return;
    setCardShuffles(0);
    setItemShuffles(0);
    void postJson("/api/shop/enter", { teamId: team }).catch(() => { /* 忽略：僅重置計數，失敗不影響購買 */ });
  }, [team]);

  if (!snap || !data) return <p className="text-sm text-slate-400">載入中…</p>;
  const cur = snap.teams.find((t) => t.id === team);
  // 五折券（MYSTERY_SHOP_PRICE）是否仍生效中：地圖流程在抽卡時已就地發券，這裡只反映狀態。
  const hasVoucher = (cur?.items ?? []).some((i) => i.effectType === EffectType.MYSTERY_SHOP_PRICE);
  const byType = new Map(data.cards.map((c) => [c.type, c]));
  const byId = new Map((itemData?.items ?? []).map((it) => [String(it.id), it]));

  // 限購模式：剩餘額度（passGoShopCredit）用完即鎖住所有購買（兩個 tab 一致）。
  const passGoCredit = cur?.passGoShopCredit ?? 0;
  const limitedLocked = limited && passGoCredit <= 0;
  // 下一次重抽成本（0 次＝免費，之後遞增）：卡 ×10（點數）、動產 ×100（光幣）。
  const cardShuffleCost = reshuffleCost("cards", cardShuffles);
  const itemShuffleCost = reshuffleCost("items", itemShuffles);
  const cardShuffleLabel = cardShuffleCost > 0 ? `重抽三張（-${cardShuffleCost} 點）` : "重抽三張（免費）";
  const itemShuffleLabel = itemShuffleCost > 0 ? `重抽三件（-${itemShuffleCost} 光幣）` : "重抽三件（免費）";
  // 付費重抽：先扣費（後端）再本地重抽並更新鏡射次數 / 餘額。餘額不足由後端擋下（丟錯）。
  const doReshuffle = async (kind: "cards" | "items") => {
    if (team === "") return;
    const r = await postJson("/api/shop/reshuffle", { teamId: team, kind });
    if (kind === "cards") { cardDisplay.redraw(); setCardShuffles(r.count); }
    else { itemDisplay.redraw(); setItemShuffles(r.count); }
    // 回合操作：重抽費也是本回合此處的支出 → 卡＝卡牌點數、動產＝光幣，累計為負併入階段 2。
    if (turnMode && r.cost > 0) {
      if (kind === "cards") setTurnPoints((p) => p - r.cost);
      else setTurnDelta((d) => d - r.cost);
    }
    await mutateSnap();
    return r.cost > 0 ? `已重抽（-${r.cost}）` : "已重抽（免費）";
  };

  return (
    <div className="space-y-4">
            <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["cards", "功能卡", <CreditCard key="c" className="h-4 w-4" />],
          ["assets", "動產", <Package key="a" className="h-4 w-4" />],
        ] as const}
      />
      
      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
          {cur ? (
            <span className="flex gap-4 text-sm text-slate-400">
              <span>卡牌點數 <Num className="font-bold text-cyan-300">{cur.cardPoints}</Num></span>
              <span>光幣 <Num className="font-bold text-amber-300">{cur.coins}</Num></span>
            </span>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇購買小隊</span>
          )}
        </div>
      </StickyTeam>

      {freeMode && (
        <Card title="神秘禮物・神秘商店五折券">
          <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200">
            {hasVoucher
              ? "🎁 五折券生效中：下方購買第一件動產 / 功能卡自動 5 折，買完即失效。"
              : "（已使用或尚未持有五折券）下方為神秘商店一般購買。"}
          </div>
        </Card>
      )}

      {tab === "cards" ? (
      <>
      <Card title={<ShopDisplayTitle label="展示中（3 張・進商店重抽一組，可付點數再重抽）" limited={limited} locked={limitedLocked} />}>
        {limitedLocked ? (
          <p className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-3 text-center text-sm font-semibold text-slate-300">
            本次過起點限購已用完（功能卡 / 動產擇一買一件）。
          </p>
        ) : (
        <>
        <div className="mb-3 flex items-center justify-between gap-3">
          <ActionButton
            label={cardShuffleLabel}
            className="chip shrink-0"
            disabled={team === "" || (cardShuffleCost > 0 && (cur?.cardPoints ?? 0) < cardShuffleCost)}
            onAction={() => doReshuffle("cards")}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cardDisplay.keys.map((type, i) => {
            const c = byType.get(type);
            const soldOut = !c || c.remaining <= 0;
            const cantAfford = !!c && team !== "" && (cur?.cardPoints ?? 0) < c.cost;
            return (
              <DealtCard key={`${type}-${i}`} index={i} dealKey={cardDisplay.dealKey}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  {c && (
                    <div className="relative mx-auto mb-2 aspect-3/4 w-full max-w-[140px] overflow-hidden rounded-lg border border-cyan-400/20 bg-black/20">
                      <Image src={functionCardImage(c.type)} alt={c.type} fill sizes="140px" className="object-cover" />
                    </div>
                  )}
                  <div className="text-base font-bold text-cyan-200">{c?.type ?? "（空）"}</div>
                  <div className="mt-1 h-8 text-xs text-slate-400">{c?.effect ?? ""}</div>
                  <div className="my-2 text-sm text-slate-300">點數 <Num className="font-bold text-cyan-300">{c?.cost ?? 0}</Num>　庫存 <Num>{c?.remaining ?? 0}</Num></div>
                  <ActionButton
                    label={soldOut ? "已售完" : limitedLocked ? "限購已用完" : cantAfford ? `點數不足（- ${c.cost - (cur?.cardPoints ?? 0)}）` : "購買"}
                    className="w-full btn-emerald"
                    disabled={team === "" || soldOut || cantAfford || limitedLocked}
                    onAction={async () => {
                      const r = await postJson("/api/shop/sell", { teamId: team, cardType: type, limited });
                      await mutateShop();
                      await mutateSnap(); // 限購額度 / 餘額即時更新
                      if (!limited) cardDisplay.redraw(); // 一般模式買一張 → 立刻重抽三張；限購買完即鎖不重抽
                      // 回合操作：功能卡購買是卡牌點數支出 → 累計為負，待「完成」併入地圖階段 2。
                      if (turnMode) setTurnPoints((p) => p - (r.cost ?? 0));
                      return `售出 ${r.card}（-${r.cost} 點）`;
                    }} />
                </div>
              </DealtCard>
            );
          })}
        </div>
        </>
        )}
      </Card>

      <Card title="庫存總覽">
        <ul className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
          {data.cards.map((c) => (
            <li key={c.type} className="flex items-center justify-between gap-2 border-b border-white/10 py-1">
              <span className="flex items-center gap-2">
                <span className="relative h-8 w-6 shrink-0 overflow-hidden rounded border border-white/10 bg-black/20">
                  <Image src={functionCardImage(c.type)} alt={c.type} fill sizes="24px" className="object-cover" />
                </span>
                {c.type}
              </span>
              <span className="text-slate-400">點數 {c.cost}・剩 {c.remaining}</span>
            </li>
          ))}
        </ul>
      </Card>
      </>
      ) : (
      <Card title={<ShopDisplayTitle label="展示中（3 件・進商店重抽一組，可付光幣再重抽）" limited={limited} locked={limitedLocked} />}>
        {limitedLocked ? (
          <p className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-3 text-center text-sm font-semibold text-slate-300">
            本次過起點限購已用完（功能卡 / 動產擇一買一件）。
          </p>
        ) : (
        <>
        <div className="mb-3 flex items-center justify-between gap-3">
          <ActionButton
            label={itemShuffleLabel}
            className="chip shrink-0"
            disabled={team === "" || (itemShuffleCost > 0 && (cur?.coins ?? 0) < itemShuffleCost)}
            onAction={() => doReshuffle("items")}
          />
        </div>
        {!itemData?.items?.length ? (
          <p className="text-sm text-slate-400">目前沒有上架中的動產。</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {itemDisplay.keys.map((id, i) => {
              const it = byId.get(id);
              const soldOut = !it || it.shopStock <= 0;
              const cantAfford = !!it && team !== "" && (cur?.coins ?? 0) < it.price;
              return (
                <DealtCard key={`${id}-${i}`} index={i} dealKey={itemDisplay.dealKey}>
                  <div className={`flex h-full flex-col rounded-xl border p-3 ${ITEM_GRADE_COLORS[it?.grade ?? ""] ?? "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${ITEM_GRADE_COLORS[it?.grade ?? ""] ?? "chip"}`}>{it?.grade ?? "?"}</span>
                      <span className="text-sm font-bold text-slate-100">{it?.name ?? "（空）"}</span>
                    </div>
                    <p className="mt-1 flex-1 text-xs leading-snug text-slate-300/80">{it?.description ?? ""}</p>
                    <div className="my-2 text-sm text-slate-300">
                      售價 <Num className="font-bold text-amber-300">{it?.price ?? 0}</Num> 光幣　庫存 <Num>{it?.shopStock ?? 0}</Num>
                    </div>
                    <ActionButton
                      label={soldOut ? "已售完" : limitedLocked ? "限購已用完" : cantAfford ? `光幣不足（- ${it.price - (cur?.coins ?? 0)}）` : "購買"}
                      className="w-full btn-emerald"
                      disabled={team === "" || soldOut || cantAfford || limitedLocked}
                      onAction={async () => {
                        const r = await postJson("/api/shop/item", { teamId: team, assetId: it!.id, limited });
                        await mutateItems();
                        await mutateSnap(); // 限購額度 / 餘額即時更新
                        if (!limited) itemDisplay.redraw(); // 一般模式買一件 → 立刻重抽；限購買完即鎖不重抽
                        // 回合操作：動產購買是支出 → 累計為負，待「完成」併入地圖階段 2。
                        if (turnMode) setTurnDelta((d) => d - (r.price ?? 0));
                        return `售出 ${r.name}（-${r.price} 光幣）`;
                      }}
                    />
                  </div>
                </DealtCard>
              );
            })}
          </div>
        )}
        </>
        )}
      </Card>
      )}

      {turnMode && onComplete && (
        <TurnCompleteBar delta={turnDelta} onComplete={(d) => onComplete(d, undefined, { cardPoints: turnPoints })} />
      )}
    </div>
  );
}
