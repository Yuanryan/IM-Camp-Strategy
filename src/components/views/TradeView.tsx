"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, TeamItemBadges } from "@/components/ui";
import { EffectType } from "@/lib/game";
import { TransactionAnimation, type TxResult } from "@/components/TransactionAnimation";

type Resolved = { id: number; toTeamName: string; coins: number; cardPoints: number };
type TradeData = {
  incoming: { id: number; fromTeamName: string; coins: number; cardPoints: number }[];
  outgoing: { id: number; toTeamName: string; coins: number; cardPoints: number }[];
  justAccepted: Resolved[];
  justRejected: Resolved[];
};

function TradeAmt({ coins, points }: { coins: number; points: number }) {
  return (
    <span className="font-bold">
      {coins > 0 && <span className="neon-gold">{coins} 光幣</span>}
      {coins > 0 && points > 0 && <span className="text-slate-400"> + </span>}
      {points > 0 && <span className="text-cyan-300">{points} 點數</span>}
    </span>
  );
}

export function TradeView({ teamId }: { teamId: number }) {
  const { snap } = useSnapshot(3000);
  const { data, mutate } = useSWR<TradeData>("/api/trade", fetcher, { refreshInterval: 3000 });
  const [to, setTo] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
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
      <Card title="發起交易（送出光幣 / 卡牌點數）">
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ActionButton label="發起交易" disabled={to === "" || (coins === 0 && points === 0)}
            onAction={async () => {
              if (to === "") return "請先選對象";
              if (coins === 0 && points === 0) return "請輸入交易內容";
              await postJson("/api/trade", { toTeamId: to, coins, cardPoints: points });
              await mutate();
              setCoins(0);
              setPoints(0);
              setTo("");
              return "已發起交易（資源已凍結，待對方接受）";
            }} />
          <span className="text-xs text-slate-500">
            你的餘額：光幣 <Num className="neon-gold">{me?.coins}</Num>　點數 <Num className="text-cyan-300">{me?.cardPoints}</Num>
          </span>
        </div>
        <TeamItemBadges items={me?.items ?? []} relevantTypes={[EffectType.ALLIANCE_BONUS]} />
        <p className="mt-2 text-xs text-slate-500">發起後資源立即凍結；對方接受才轉出，拒絕或你取消則退回。</p>
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
                  <b className="text-cyan-300">{t.fromTeamName}</b> 要給你 <TradeAmt coins={t.coins} points={t.cardPoints} />
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
                          detail: <span>收到 {t.fromTeamName} <TradeAmt coins={t.coins} points={t.cardPoints} /></span>,
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
                  給 <b>{t.toTeamName}</b> <TradeAmt coins={t.coins} points={t.cardPoints} />
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
