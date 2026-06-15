"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher, useSnapshot, postJson, ActionButton, toast } from "@/components/client";
import { Card } from "@/components/Shell";
import { AnimatedNum, AssetPicker } from "@/components/ui";

type LotType = "CUSTOM" | "ITEM" | "PROPERTY";

type ManageLot = {
  id: number;
  orderIndex: number;
  title: string;
  description: string;
  lotType: string;
  startPrice: number;
  currentBid: number;
  status: string;
  winnerTeamId: number | null;
  finalPrice: number | null;
};

type Manage = {
  events: {
    id: number;
    name: string;
    announcement: string;
    lots: ManageLot[];
  }[];
  assets: { id: number; name: string; grade: string; effectType: string; description: string }[];
  properties: { id: number; name: string; region: string; basePrice: number }[];
  teams: { id: number; name: string; coins: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "待拍",
  LIVE: "拍賣中",
  SOLD: "已成交",
  PASSED: "流標",
  CANCELLED: "已取消",
};

const RAISE_STEPS = [50, 100, 200, 500];

const LOT_TYPE_LABEL: Record<LotType, string> = { ITEM: "動產", PROPERTY: "不動產", CUSTOM: "自訂"  };

// 場次建立前，先在前端暫存的拍賣品（尚未進資料庫）
type StagedLot = {
  _id: string; // 前端穩定 key，供重新排序動畫（layout 動畫需穩定 key）
  title: string;
  description: string;
  lotType: LotType;
  assetId: number | null;
  propertyId: number | null;
  hiddenValue: number;
  startPrice: number;
};
// 產生穩定唯一 key（不用 module-level 計數器，避免 dev 熱重載重置造成重複 key）
const newStagedId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function AuctionView() {
  const { snap, mutate: mutateSnap } = useSnapshot(1500);
  const { data: manage, mutate: mutateManage } = useSWR<Manage>("/api/auction", fetcher, {
    refreshInterval: 2000,
  });

  // 建立場次表單（公告預設「5 分鐘後開始」，可改）
  const DEFAULT_ANNOUNCE = "拍賣將於 5 分鐘後開始，請準備！";
  const [eventName, setEventName] = useState("");
  const [eventAnnounce, setEventAnnounce] = useState(DEFAULT_ANNOUNCE);

  // 籌備階段：先在前端暫存的拍賣品清單
  const [staged, setStaged] = useState<StagedLot[]>([]);

  // 建立拍賣品表單（籌備時填入 staged；場次進行中則直接送 API）
  const [lotType, setLotType] = useState<LotType>("ITEM");
  const [lotTitle, setLotTitle] = useState("");
  const [lotDesc, setLotDesc] = useState("");
  const [lotAsset, setLotAsset] = useState<number | "">("");
  const [lotProperty, setLotProperty] = useState<number | "">("");
  const [lotHidden, setLotHidden] = useState("");
  const [lotStart, setLotStart] = useState("");

  // 喊價 / 落槌
  const [bidInput, setBidInput] = useState("");
  const [winner, setWinner] = useState<number | "">("");

  const refresh = async () => {
    await Promise.all([mutateSnap(), mutateManage()]);
  };

  // 從表單讀出一筆拍賣品（含驗證），並清空表單。供「籌備暫存」與「進行中新增」共用。
  const readLotForm = (): StagedLot => {
    if (!lotTitle.trim()) throw new Error("請輸入標題");
    if (lotType === "ITEM" && lotAsset === "") throw new Error("請選擇動產");
    if (lotType === "PROPERTY" && lotProperty === "") throw new Error("請選擇不動產");
    const lot: StagedLot = {
      _id: newStagedId(),
      title: lotTitle.trim(),
      description: lotDesc,
      lotType,
      assetId: lotType === "ITEM" ? (lotAsset as number) : null,
      propertyId: lotType === "PROPERTY" ? (lotProperty as number) : null,
      hiddenValue: lotType === "ITEM" ? parseInt(lotHidden, 10) || 0 : 0,
      startPrice: parseInt(lotStart, 10) || 0,
    };
    setLotTitle("");
    setLotDesc("");
    setLotAsset("");
    setLotProperty("");
    setLotHidden("");
    setLotStart("");
    return lot;
  };

  // 調整籌備清單中拍賣品的順序（dir=-1 上移、+1 下移）
  const moveStaged = (i: number, dir: -1 | 1) => {
    setStaged((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  if (!manage || !snap) return <p className="text-sm text-slate-400">載入中…</p>;

  const event = manage.events[0]; // 一次一個未結束場次
  const live = snap.auction.live;
  const coinOf = (id: number) => manage.teams.find((t) => t.id === id)?.coins ?? 0;
  // 待拍佇列：場次內尚未拍賣（DRAFT）的拍賣品，依順序排列
  const queue = (event?.lots ?? []).filter((l) => l.status === "DRAFT");
  const nextLot = queue[0];

  return (
    <div className="space-y-4">
      {/* ── 開始下一件（沒有進行中、但佇列還有東西時顯示）──── */}
      {event && !live && nextLot && (
        <Card className="border-cyan-400/30 bg-cyan-400/5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-[11px] uppercase tracking-widest text-cyan-300/70">
              下一件拍賣品
            </div>
            <div className="text-2xl font-black text-slate-100">{nextLot.title}</div>
            <div className="text-xs text-slate-500">
              起標 {nextLot.startPrice}・總共還有 {queue.length} 件
            </div>
            <ActionButton
              label="開始下一件 →"
              className="btn-cyan px-6 py-3 text-base font-bold"
              onAction={async () => {
                await postJson("/api/auction/lot/next", { eventId: event.id });
                await refresh();
                return `開始拍賣：${nextLot.title}`;
              }}
            />
          </div>
        </Card>
      )}

      {/* 場次有了、但佇列空了（且沒有進行中）：提示新增或結束 */}
      {event && !live && !nextLot && (
        <Card className="border-white/10">
          <p className="text-center text-sm text-slate-400">
            佇列已無待拍的拍賣品。請於下方「新增拍賣品」，或結束拍賣。
          </p>
        </Card>
      )}

      {/* ── 拍賣中（主畫面）─────────────────────────────── */}
      {live && (
        <Card className="border-amber-400/30 bg-amber-400/5">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-widest text-amber-300/70">拍賣中</div>
            <div className="mt-1 text-2xl font-black text-slate-100">{live.title}</div>
            {live.description && (
              <div className="mt-1 text-sm text-slate-400">{live.description}</div>
            )}
            <div className="mt-4 text-[11px] uppercase tracking-widest text-slate-400">目前喊價</div>
            <AnimatedNum value={live.currentBid} className="neon-gold text-7xl font-black leading-none" />
            <div className="mt-1 text-xs text-slate-500">起標 {live.startPrice}</div>
          </div>

          {/* 喊價：小隊喊、拍賣官按 */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {RAISE_STEPS.map((step) => (
              <ActionButton
                key={step}
                label={`+${step}`}
                className="chip px-4 py-3 text-base font-bold"
                onAction={async () => {
                  await postJson("/api/auction/lot/bump", {
                    lotId: live.id,
                    amount: live.currentBid + step,
                  });
                  await refresh();
                  return `喊價 ${live.currentBid + step}`;
                }}
              />
            ))}
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                placeholder="自訂價"
                className="fld w-28"
              />
              <ActionButton
                label="喊價"
                onAction={async () => {
                  const amount = parseInt(bidInput, 10);
                  if (Number.isNaN(amount)) throw new Error("請輸入數字");
                  await postJson("/api/auction/lot/bump", { lotId: live.id, amount });
                  setBidInput("");
                  await refresh();
                  return `喊價 ${amount}`;
                }}
              />
            </div>
          </div>

          {/* 各隊光幣一覽：低於目前喊價者變暗（買不起），點一下即選為得標隊 */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-2 text-center text-[11px] uppercase tracking-widest text-slate-400">
              各隊光幣（點選即設為得標隊）
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {manage.teams.map((t) => {
                const broke = t.coins < live.currentBid;
                const picked = winner === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWinner(picked ? "" : t.id)}
                    title={broke ? "光幣不足，無法得標" : "設為得標隊"}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      picked
                        ? "border-amber-400/60 bg-amber-400/20 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.25)]"
                        : broke
                          ? "border-white/5 bg-white/3 text-slate-600"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/40"
                    }`}
                  >
                    {t.name}
                    <AnimatedNum
                      value={t.coins}
                      className={`ml-1.5 ${broke && !picked ? "text-slate-600" : "text-amber-300/90"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 落槌：上方點選得標隊 → 成交 */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {winner !== "" && (
                <span className="text-sm font-semibold text-slate-300">
                  得標隊：
                  <span
                    className={`ml-1 ${
                      coinOf(winner) < live.currentBid ? "text-rose-400" : "text-amber-200"
                    }`}
                  >
                    {manage.teams.find((t) => t.id === winner)?.name}（光幣 {coinOf(winner)}
                    {coinOf(winner) < live.currentBid && "・不足"}）
                  </span>
                </span>
              )}
              <ActionButton
                label="落槌成交"
                className="btn-gold px-5 py-3 text-base font-bold"
                disabled={winner === ""}
                confirmText={
                  winner === "" ? undefined : `以 ${live.currentBid} 成交給該隊？`
                }
                onAction={async () => {
                  if (winner === "") throw new Error("請先選擇得標小隊");
                  const r = await postJson("/api/auction/lot/hammer", {
                    lotId: live.id,
                    winnerTeamId: winner,
                  });
                  setWinner("");
                  await refresh();
                  // 撤銷走 /api/auction/lot/undo（清單上「撤銷成交」鈕），不走通用 undo
                  return `成交 ${r.price}（可於清單撤銷）`;
                }}
              />
              <ActionButton
                label="流標"
                className="chip px-4 py-3"
                confirmText="此件流標（不成交）？"
                onAction={async () => {
                  await postJson("/api/auction/lot/pass", { lotId: live.id });
                  await refresh();
                  return "已流標";
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* ════ 籌備模式（尚未建立場次）════════════════════════
          流程：先準備所有拍賣品 → 填場次名稱與公告 → 一鍵建立場次並公告 */}
      {!event && (
        <>
          <Card title="① 準備拍賣品">
            <p className="mb-3 text-xs text-slate-400">
              先把這場要拍的東西全部加進清單。
            </p>
            <LotForm
              lotType={lotType}
              setLotType={setLotType}
              lotTitle={lotTitle}
              setLotTitle={setLotTitle}
              lotDesc={lotDesc}
              setLotDesc={setLotDesc}
              lotAsset={lotAsset}
              setLotAsset={setLotAsset}
              lotProperty={lotProperty}
              setLotProperty={setLotProperty}
              lotHidden={lotHidden}
              setLotHidden={setLotHidden}
              lotStart={lotStart}
              setLotStart={setLotStart}
              assets={manage.assets}
              properties={manage.properties}
              addLabel="加入清單"
              onAdd={async () => {
                const lot = readLotForm();
                setStaged((prev) => [...prev, lot]);
                return "已加入清單";
              }}
            />
          </Card>

          <Card title={`拍賣清單（${staged.length} 件）`}>
            {staged.length === 0 ? (
              <p className="text-sm text-slate-400">尚未加入任何拍賣品。</p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {staged.map((lot, i) => (
                    <motion.li
                      key={lot._id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-black text-slate-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold">{lot.title}</span>
                          <span className="ml-2 text-[11px] text-slate-500">
                            {LOT_TYPE_LABEL[lot.lotType]}・起標 {lot.startPrice}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          disabled={i === 0}
                          title="上移"
                          className="chip grid h-9 w-9 place-items-center rounded-lg text-sm font-bold disabled:opacity-30"
                          onClick={() => moveStaged(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={i === staged.length - 1}
                          title="下移"
                          className="chip grid h-9 w-9 place-items-center rounded-lg text-sm font-bold disabled:opacity-30"
                          onClick={() => moveStaged(i, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="chip rounded-lg px-3 py-2 text-xs font-semibold"
                          onClick={() => setStaged((prev) => prev.filter((s) => s._id !== lot._id))}
                        >
                          移除
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          <Card title="② 建立場次並公告">
            <p className="mb-3 text-xs text-slate-400">
              填好場次名稱與公告，按下後場次成立、公告橫幅立刻顯示在小隊手機上，即可開始拍賣。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="場次名稱（例：第x場拍賣會）"
                className="fld flex-1"
              />
              <input
                value={eventAnnounce}
                onChange={(e) => setEventAnnounce(e.target.value)}
                placeholder="公告橫幅文字"
                className="fld flex-1"
              />
              <ActionButton
                label="建立場次並公告"
                className="btn-gold px-5 font-bold"
                onAction={async () => {
                  if (!eventName.trim()) throw new Error("請輸入場次名稱");
                  if (staged.length === 0) throw new Error("請先加入至少一件拍賣品");
                  // 建立場次（公告立即顯示）
                  const r = await postJson("/api/auction/event/create", {
                    name: eventName,
                    announcement: eventAnnounce,
                  });
                  const eventId = r.event.id as number;
                  // 依序把暫存的拍賣品送進資料庫
                  for (let i = 0; i < staged.length; i++) {
                    const lot = staged[i];
                    await postJson("/api/auction/lot/create", {
                      eventId,
                      title: lot.title,
                      description: lot.description,
                      lotType: lot.lotType,
                      assetId: lot.assetId,
                      propertyId: lot.propertyId,
                      hiddenValue: lot.hiddenValue,
                      startPrice: lot.startPrice,
                      orderIndex: i,
                    });
                  }
                  setStaged([]);
                  setEventName("");
                  setEventAnnounce(DEFAULT_ANNOUNCE);
                  await refresh();
                  return `已建立場次並公告（${staged.length} 件）`;
                }}
              />
            </div>
          </Card>
        </>
      )}

      {/* ════ 進行模式（場次已建立）════════════════════════ */}
      {event && (
        <Card title={`場次：${event.name}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              defaultValue={event.announcement}
              key={event.announcement}
              onBlur={async (e) => {
                if (e.target.value === event.announcement) return;
                await postJson("/api/auction/event/announce", {
                  eventId: event.id,
                  announcement: e.target.value,
                });
                await refresh();
                toast("公告已更新", "ok");
              }}
              placeholder="公告文字（清空即不顯示橫幅）"
              className="fld flex-1"
            />
            <ActionButton
              label="結束拍賣"
              className="chip"
              confirmText="結束此拍賣場次？"
              onAction={async () => {
                await postJson("/api/auction/event/end", { eventId: event.id });
                await refresh();
                return "場次已結束";
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            修改公告後點擊輸入框外即儲存。空白＝不顯示橫幅。
          </p>
        </Card>
      )}

      {/* ── 進行中：補加拍賣品（臨時追加用）+ 清單 ─────────── */}
      {event && (
        <>
          <Card title="補加拍賣品">
            <LotForm
              lotType={lotType}
              setLotType={setLotType}
              lotTitle={lotTitle}
              setLotTitle={setLotTitle}
              lotDesc={lotDesc}
              setLotDesc={setLotDesc}
              lotAsset={lotAsset}
              setLotAsset={setLotAsset}
              lotProperty={lotProperty}
              setLotProperty={setLotProperty}
              lotHidden={lotHidden}
              setLotHidden={setLotHidden}
              lotStart={lotStart}
              setLotStart={setLotStart}
              assets={manage.assets}
              properties={manage.properties}
              addLabel="加入佇列"
              onAdd={async () => {
                const lot = readLotForm();
                await postJson("/api/auction/lot/create", {
                  eventId: event.id,
                  title: lot.title,
                  description: lot.description,
                  lotType: lot.lotType,
                  assetId: lot.assetId,
                  propertyId: lot.propertyId,
                  hiddenValue: lot.hiddenValue,
                  startPrice: lot.startPrice,
                  orderIndex: event.lots.length,
                });
                await refresh();
                return "已加入佇列";
              }}
            />
          </Card>

          <Card title={`拍賣品清單（待拍 ${queue.length}／共 ${event.lots.length}）`}>
            {event.lots.length === 0 ? (
              <p className="text-sm text-slate-400">尚無拍賣品，請於上方新增後用「開始下一件」依序拍賣。</p>
            ) : (
              <ul className="space-y-2">
                {event.lots.map((lot) => {
                  // 待拍項目顯示在佇列中的順序號（1 = 下一件）
                  const queuePos =
                    lot.status === "DRAFT" ? queue.findIndex((q) => q.id === lot.id) + 1 : 0;
                  return (
                    <li
                      key={lot.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {queuePos > 0 && (
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${
                              queuePos === 1
                                ? "bg-cyan-400 text-slate-950"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {queuePos}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold">{lot.title}</span>
                          <span className="ml-2 text-[11px] text-slate-500">
                            {lot.lotType === "ITEM" ? "動產" : lot.lotType === "PROPERTY" ? "不動產" : "自訂"}
                            ・起標 {lot.startPrice}
                          </span>
                          <span
                            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              lot.status === "LIVE"
                                ? "bg-amber-500/20 text-amber-300"
                                : lot.status === "SOLD"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {STATUS_LABEL[lot.status] ?? lot.status}
                          </span>
                          {lot.status === "SOLD" && (
                            <span className="ml-2 text-[11px] text-emerald-300/80">
                              成交 {lot.finalPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {lot.status === "SOLD" && (
                          <ActionButton
                            label="撤銷成交"
                            className="chip px-3 py-2 text-xs"
                            confirmText="撤銷此筆成交？將退款並收回交付物，拍賣品退回拍賣中。"
                            onAction={async () => {
                              await postJson("/api/auction/lot/undo", { lotId: lot.id });
                              await refresh();
                              return "已撤銷成交";
                            }}
                          />
                        )}
                        {lot.status === "DRAFT" && (
                          <ActionButton
                            label="移除"
                            className="chip px-3 py-2 text-xs"
                            onAction={async () => {
                              await postJson("/api/auction/lot/cancel", { lotId: lot.id });
                              await refresh();
                              return "已移除";
                            }}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// 拍賣品輸入表單（籌備時加入前端清單；進行中時直接送 API）。
// onAdd 由呼叫端決定行為，回傳成功訊息字串。
function LotForm({
  lotType,
  setLotType,
  lotTitle,
  setLotTitle,
  lotDesc,
  setLotDesc,
  lotAsset,
  setLotAsset,
  lotProperty,
  setLotProperty,
  lotHidden,
  setLotHidden,
  lotStart,
  setLotStart,
  assets,
  properties,
  addLabel,
  onAdd,
}: {
  lotType: LotType;
  setLotType: (t: LotType) => void;
  lotTitle: string;
  setLotTitle: (s: string) => void;
  lotDesc: string;
  setLotDesc: (s: string) => void;
  lotAsset: number | "";
  setLotAsset: (v: number | "") => void;
  lotProperty: number | "";
  setLotProperty: (v: number | "") => void;
  lotHidden: string;
  setLotHidden: (s: string) => void;
  lotStart: string;
  setLotStart: (s: string) => void;
  assets: { id: number; name: string; grade: string; description: string }[];
  properties: { id: number; name: string; region: string; basePrice: number }[];
  addLabel: string;
  onAdd: () => Promise<string>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["ITEM", "PROPERTY"] as LotType[]).map((t) => ( // 目前先提供「動產」與「不動產」，「自訂」暫不開放
          <button
            key={t}
            type="button"
            onClick={() => {
              if (t === lotType) return;
              setLotType(t);
              // 切換類型時清掉前一類自動帶入的名稱/說明與選取，避免殘留
              setLotTitle("");
              setLotDesc("");
              setLotAsset("");
              setLotProperty("");
              setLotHidden("");
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              lotType === t ? "btn-cyan" : "chip"
            }`}
          >
            {LOT_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <input
        value={lotTitle}
        onChange={(e) => setLotTitle(e.target.value)}
        placeholder="拍賣品標題"
        className="fld w-full"
      />
      <input
        value={lotDesc}
        onChange={(e) => setLotDesc(e.target.value)}
        placeholder="說明（選填）"
        className="fld w-full"
      />

      {lotType === "ITEM" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <AssetPicker
            assets={assets}
            value={lotAsset}
            onChange={(id) => {
              setLotAsset(id);
              // 自動帶入該動產的名稱與說明（拍賣官仍可手動修改）
              const a = id === "" ? undefined : assets.find((x) => x.id === id);
              if (a) {
                setLotTitle(a.name);
                setLotDesc(a.description);
              }
            }}
            className="flex-1"
          />
          <input
            type="number"
            value={lotHidden}
            onChange={(e) => setLotHidden(e.target.value)}
            placeholder="結算秘密幣值"
            className="fld w-40"
          />
        </div>
      )}

      {lotType === "PROPERTY" && (
        <select
          value={lotProperty}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : "";
            setLotProperty(id);
            // 自動帶入該不動產的名稱與說明（不動產無描述欄，用區域＋底價組）
            const p = id === "" ? undefined : properties.find((x) => x.id === id);
            if (p) {
              setLotTitle(p.name);
              setLotDesc(`${p.region} 區不動產・底價 ${p.basePrice}`);
            }
          }}
          className="fld w-full"
        >
          <option value="">選擇未售出不動產</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}（{p.region}・底價 {p.basePrice}）
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={lotStart}
          onChange={(e) => setLotStart(e.target.value)}
          placeholder="起標價"
          className="fld w-40"
        />
        <ActionButton label={addLabel} onAction={onAdd} />
      </div>
    </div>
  );
}
