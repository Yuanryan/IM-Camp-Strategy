"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, TeamItemBadges } from "@/components/ui";
import { EffectType, ITEM_GRADE_COLORS } from "@/lib/game";
import { TransactionAnimation, type TxResult } from "@/components/TransactionAnimation";

type TradeItem = { id: number; name: string; grade: string };
type Resolved = { id: number; toTeamName: string; coins: number; cardPoints: number };
type PendingTrade = { id: number; coins: number; cardPoints: number; items: TradeItem[] };
type TradeData = {
  incoming: (PendingTrade & { fromTeamName: string })[];
  outgoing: (PendingTrade & { toTeamName: string })[];
  justAccepted: Resolved[];
  justRejected: Resolved[];
};

function TradeAmt({ coins, points, items }: { coins: number; points: number; items?: TradeItem[] }) {
  const parts: ReactNode[] = [];
  if (coins > 0) parts.push(<span key="c" className="neon-gold">{coins} 光幣</span>);
  if (points > 0) parts.push(<span key="p" className="text-cyan-300">{points} 點數</span>);
  (items ?? []).forEach((it) =>
    parts.push(
      <span key={`i${it.id}`} className={`rounded px-1 py-0.5 text-[11px] ${ITEM_GRADE_COLORS[it.grade] ?? "chip"}`}>
        {it.name}
      </span>,
    ),
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 font-bold align-middle">
      {parts.map((node, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-400">+</span>}
          {node}
        </span>
      ))}
    </span>
  );
}

export function TradeView({ teamId }: { teamId: number }) {
  const { snap } = useSnapshot(3000);
  const { data, mutate } = useSWR<TradeData>("/api/trade", fetcher, { refreshInterval: 3000 });
  const [to, setTo] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [itemIds, setItemIds] = useState<number[]>([]);
  const [result, setResult] = useState<TxResult>(null);
  const [busyId, setBusyId] = useState<number | null>(null); // 該列處理中：接受/拒絕互鎖
  const celebrated = useRef<Set<number>>(new Set());
  const initialized = useRef(false);

  // 發起方：偵測到自己發出的交易被對方「接受 / 拒絕」→ 跳對應動畫
  useEffect(() => {
    if (!data) return;
    const accepted = data.justAccepted.map((t) => ({ ...t, kind: "accepted" as const }));
    const rejected = data.justRejected.map((t) => ({ ...t, kind: "rejected" as const }));
    const list = [...accepted, ...rejected];
    if (!initialized.current) {
      list.forEach((t) => celebrated.current.add(t.id)); // 首次載入不補播舊的
      initialized.current = true;
      return;
    }
    const fresh = list.find((t) => !celebrated.current.has(t.id));
    if (fresh) {
      list.forEach((t) => celebrated.current.add(t.id));
      setResult(
        fresh.kind === "accepted"
          ? { status: "success", detail: <span>對方已接受 — 給 {fresh.toTeamName} <TradeAmt coins={fresh.coins} points={fresh.cardPoints} /></span> }
          : { status: "rejected", detail: <span>{fresh.toTeamName} 拒絕了交易（<TradeAmt coins={fresh.coins} points={fresh.cardPoints} /> 已退回）</span> },
      );
    }
  }, [data]);

  if (!snap || !data) return <p className="text-sm text-slate-400">載入中…</p>;
  const me = snap.teams.find((t) => t.id === teamId);
  const others = snap.teams.filter((t) => t.id !== teamId);
  const myItems = me?.items ?? []; // 快照已排除凍結中動產，故清單即「可交易」
  const toggleItem = (id: number) =>
    setItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const nothingToSend = coins === 0 && points === 0 && itemIds.length === 0;

  // 拒絕（收受方按）— 自己餘額不變，只需刷新列表
  const act = async (tradeId: number, action: string, ok: string) => {
    await postJson("/api/trade/action", { tradeId, action });
    await mutate();
    return ok;
  };

  return (
    <div className="space-y-4">
      <TransactionAnimation result={result} onClose={() => setResult(null)} />

      {/* 發起交易 */}
      <Card title="發起交易（送出光幣 / 卡牌點數 / 動產）">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400 sm:col-span-2">
            <div className="mb-1">對象小隊</div>
            <TeamSelect teams={others} value={to} onChange={setTo} />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">光幣</div>
            <input type="number" inputMode="numeric" min={0} value={coins}
              onChange={(e) => setCoins(Math.max(0, Number(e.target.value) || 0))} className="fld w-full" />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">卡牌點數</div>
            <input type="number" inputMode="numeric" min={0} value={points}
              onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))} className="fld w-full" />
          </label>
        </div>

        {/* 我的動產：可勾選一併送出 */}
        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-400">我的動產{itemIds.length > 0 && `（已選 ${itemIds.length}）`}</div>
          {myItems.length === 0 ? (
            <p className="text-xs text-slate-500">目前沒有可交易的動產</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myItems.map((it) => {
                const on = itemIds.includes(it.id);
                return (
                  <button key={it.id} type="button" onClick={() => toggleItem(it.id)}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium transition active:scale-95 ${ITEM_GRADE_COLORS[it.grade] ?? "chip"} ${on ? "ring-2 ring-white/70" : "opacity-70"}`}>
                    <span className="font-bold opacity-70">{it.grade}</span> {it.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ActionButton label="發起交易" disabled={to === "" || nothingToSend}
            onAction={async () => {
              if (to === "") return "請先選對象";
              if (nothingToSend) return "請輸入交易內容";
              await postJson("/api/trade", { toTeamId: to, coins, cardPoints: points, itemIds });
              await mutate();
              setCoins(0);
              setPoints(0);
              setItemIds([]);
              setTo("");
              return "已發起交易（資源已凍結，待對方接受）";
            }} />
          <span className="text-xs text-slate-500">
            你的餘額：光幣 <Num className="neon-gold">{me?.coins}</Num>　點數 <Num className="text-cyan-300">{me?.cardPoints}</Num>
          </span>
        </div>
        <TeamItemBadges items={myItems} relevantTypes={[EffectType.ALLIANCE_BONUS]} />
        <p className="mt-2 text-xs text-slate-500">發起後資源 / 動產立即凍結（動產暫停生效）；對方接受才轉出，拒絕或你取消則退回。</p>
      </Card>

      {/* 收到的交易 */}
      <Card title={`收到的交易（${data.incoming.length}）`}>
        {data.incoming.length === 0 ? (
          <p className="text-sm text-slate-400">目前沒有待處理的交易</p>
        ) : (
          <ul className="space-y-2">
            {data.incoming.map((t) => (
              <li key={t.id} className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3">
                <div className="text-sm">
                  <b className="text-cyan-300">{t.fromTeamName}</b> 要給你 <TradeAmt coins={t.coins} points={t.cardPoints} items={t.items} />
                </div>
                <div className="mt-2 flex gap-2">
                  <ActionButton label="接受" className="btn-emerald"
                    disabled={busyId === t.id}
                    onAction={async () => {
                      setBusyId(t.id);
                      try {
                        await postJson("/api/trade/action", { tradeId: t.id, action: "accept" });
                        await mutate();
                        setResult({
                          status: "success",
                          detail: <span>收到 {t.fromTeamName} <TradeAmt coins={t.coins} points={t.cardPoints} items={t.items} /></span>,
                        });
                      } catch (e) {
                        await mutate();
                        setResult({ status: "failed", detail: e instanceof Error ? e.message : "交易失敗" });
                      } finally {
                        setBusyId(null);
                      }
                    }} />
                  <ActionButton label="拒絕" className="btn-rose"
                    disabled={busyId === t.id}
                    onAction={async () => {
                      setBusyId(t.id);
                      try {
                        return await act(t.id, "reject", "已拒絕，資源退回對方");
                      } finally {
                        setBusyId(null);
                      }
                    }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 我發出的 */}
      <Card title={`我發出的（${data.outgoing.length}）`}>
        {data.outgoing.length === 0 ? (
          <p className="text-sm text-slate-400">沒有待對方回應的交易</p>
        ) : (
          <ul className="space-y-2">
            {data.outgoing.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm">
                  給 <b>{t.toTeamName}</b> <TradeAmt coins={t.coins} points={t.cardPoints} items={t.items} />
                  <span className="ml-2 text-xs text-amber-300">待對方接受</span>
                </div>
                <ActionButton label="取消" className="chip"
                  onAction={async () => {
                    try {
                      await postJson("/api/trade/action", { tradeId: t.id, action: "cancel" });
                      await mutate();
                      setResult({ status: "canceled", detail: <span>已取消給 {t.toTeamName} 的交易（<TradeAmt coins={t.coins} points={t.cardPoints} /> 退回）</span> });
                    } catch (e) {
                      setResult({ status: "failed", detail: e instanceof Error ? e.message : "取消失敗" });
                    }
                  }} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
