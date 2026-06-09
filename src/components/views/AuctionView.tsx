"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  fetcher,
  useSnapshot,
  postJson,
  ActionButton,
  TeamSelect,
  toast,
} from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";

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

export function AuctionView() {
  const { snap, mutate: mutateSnap } = useSnapshot(1500);
  const { data: manage, mutate: mutateManage } = useSWR<Manage>("/api/auction", fetcher, {
    refreshInterval: 2000,
  });

  // 建立場次表單
  const [eventName, setEventName] = useState("");
  const [eventAnnounce, setEventAnnounce] = useState("");

  // 建立拍賣品表單
  const [lotType, setLotType] = useState<LotType>("CUSTOM");
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

  if (!manage || !snap) return <p className="text-sm text-slate-400">載入中…</p>;

  const event = manage.events[0]; // 一次一個未結束場次
  const live = snap.auction.live;
  const coinOf = (id: number) => manage.teams.find((t) => t.id === id)?.coins ?? 0;

  return (
    <div className="space-y-4">
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
            <Num className="neon-gold text-7xl font-black leading-none">{live.currentBid}</Num>
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

          {/* 落槌：選得標隊伍 + 成交 */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <TeamSelect
                teams={manage.teams}
                value={winner}
                onChange={setWinner}
                placeholder="選擇得標小隊"
              />
              {winner !== "" && (
                <span
                  className={`text-sm font-semibold ${
                    coinOf(winner) < live.currentBid ? "text-rose-400" : "text-emerald-300"
                  }`}
                >
                  該隊光幣 {coinOf(winner)}
                  {coinOf(winner) < live.currentBid && "（不足）"}
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

      {/* ── 場次 / 公告 ─────────────────────────────────── */}
      {!event ? (
        <Card title="建立拍賣場次">
          <p className="mb-3 text-xs text-slate-400">
            建立後公告會立即顯示在小隊手機上（發光橫幅）。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="場次名稱（例：期中大拍賣）"
              className="fld flex-1"
            />
            <input
              value={eventAnnounce}
              onChange={(e) => setEventAnnounce(e.target.value)}
              placeholder="公告（例：5 分鐘後開始拍賣！）"
              className="fld flex-1"
            />
            <ActionButton
              label="建立場次"
              onAction={async () => {
                if (!eventName.trim()) throw new Error("請輸入場次名稱");
                await postJson("/api/auction/event/create", {
                  name: eventName,
                  announcement: eventAnnounce,
                });
                setEventName("");
                setEventAnnounce("");
                await refresh();
                return "已建立場次";
              }}
            />
          </div>
        </Card>
      ) : (
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
              label="結束場次"
              className="chip"
              confirmText="結束此拍賣場次？公告橫幅會消失。"
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

      {/* ── 新增拍賣品 + 清單 ─────────────────────────────── */}
      {event && (
        <>
          <Card title="新增拍賣品">
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["CUSTOM", "ITEM", "PROPERTY"] as LotType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLotType(t)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      lotType === t ? "btn-cyan" : "chip"
                    }`}
                  >
                    {t === "CUSTOM" ? "自訂" : t === "ITEM" ? "動產" : "不動產"}
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
                  <select
                    value={lotAsset}
                    onChange={(e) => setLotAsset(e.target.value ? Number(e.target.value) : "")}
                    className="fld flex-1"
                  >
                    <option value="">選擇動產模板</option>
                    {manage.assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.grade}] {a.name}
                      </option>
                    ))}
                  </select>
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
                  onChange={(e) => setLotProperty(e.target.value ? Number(e.target.value) : "")}
                  className="fld w-full"
                >
                  <option value="">選擇未售出不動產</option>
                  {manage.properties.map((p) => (
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
                <ActionButton
                  label="新增"
                  onAction={async () => {
                    if (!lotTitle.trim()) throw new Error("請輸入標題");
                    if (lotType === "ITEM" && lotAsset === "")
                      throw new Error("請選擇動產模板");
                    if (lotType === "PROPERTY" && lotProperty === "")
                      throw new Error("請選擇不動產");
                    await postJson("/api/auction/lot/create", {
                      eventId: event.id,
                      title: lotTitle,
                      description: lotDesc,
                      lotType,
                      assetId: lotType === "ITEM" ? lotAsset : null,
                      propertyId: lotType === "PROPERTY" ? lotProperty : null,
                      hiddenValue: lotType === "ITEM" ? parseInt(lotHidden, 10) || 0 : 0,
                      startPrice: parseInt(lotStart, 10) || 0,
                      orderIndex: event.lots.length,
                    });
                    setLotTitle("");
                    setLotDesc("");
                    setLotAsset("");
                    setLotProperty("");
                    setLotHidden("");
                    setLotStart("");
                    await refresh();
                    return "已新增拍賣品";
                  }}
                />
              </div>
            </div>
          </Card>

          <Card title={`拍賣品清單（${event.lots.length}）`}>
            {event.lots.length === 0 ? (
              <p className="text-sm text-slate-400">尚無拍賣品</p>
            ) : (
              <ul className="space-y-2">
                {event.lots.map((lot) => (
                  <li
                    key={lot.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold">{lot.title}</span>
                      <span className="ml-2 text-[11px] text-slate-500">
                        {lot.lotType === "CUSTOM" ? "自訂" : lot.lotType === "ITEM" ? "動產" : "不動產"}
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
                        <>
                          <ActionButton
                            label="開始拍賣"
                            className="btn-cyan px-3 py-2 text-xs"
                            disabled={!!live}
                            onAction={async () => {
                              await postJson("/api/auction/lot/open", { lotId: lot.id });
                              await refresh();
                              return `開始拍賣：${lot.title}`;
                            }}
                          />
                          <ActionButton
                            label="取消"
                            className="chip px-3 py-2 text-xs"
                            onAction={async () => {
                              await postJson("/api/auction/lot/cancel", { lotId: lot.id });
                              await refresh();
                              return "已取消";
                            }}
                          />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
