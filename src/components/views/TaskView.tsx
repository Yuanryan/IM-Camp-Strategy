"use client";

import { useState } from "react";
import { useSnapshot, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, TurnCompleteBar } from "@/components/ui";
import {
  drawCard,
  useCardSettle,
  TaskCardView,
  type DrawnCard,
} from "@/components/views/LuckDraw";

// 任務分頁（全幅）：小遊戲 / 判定型好運卡・厄運卡的執行場。
// pending：由地圖階段 3 抽到任務卡時帶過來的卡（自動載入並清空 pending）。
export function TaskView({
  team,
  setTeam,
  pending,
  clearPending,
  turnMode = false,
  onComplete,
}: {
  team: number | "";
  setTeam: (id: number | "") => void;
  pending: DrawnCard | null;
  clearPending: () => void;
  // 地圖回合操作：顯示「完成」鈕返回地圖。任務卡金額由伺服器套動產效果計算、
  // 且判定型卡無固定金額，故不在此回報金流（delta 0）；卡片金流仍寫入伺服器、
  // 反映在階段 2 的即時光幣。
  turnMode?: boolean;
  onComplete?: (delta: number) => void;
}) {
  const { snap, mutate } = useSnapshot(2500);
  // 本地抽到的卡（在此分頁直接抽）；若無則顯示由地圖帶來的 pending 卡。
  const [localDrawn, setLocalDrawn] = useState<DrawnCard | null>(null);
  const drawn = localDrawn ?? pending;
  // 抽新卡 / 收起：覆蓋本地卡並清掉 pending（避免回訪重複載入）。
  const setDrawn = (card: DrawnCard | null) => { setLocalDrawn(card); clearPending(); };

  const cur = snap?.teams.find((t) => t.id === team);
  const event1 = (snap?.activeEvents ?? []).includes(1);
  const settler = useCardSettle({ team, curName: cur?.name, items: cur?.items ?? [], onDone: mutate });

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;

  return (
    <div className="space-y-4">
      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={teams} value={team} onChange={setTeam} />
          {cur ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                光幣 <Num className="neon-gold font-bold">{cur.coins}</Num>
              </span>
              <span className="text-slate-400">
                點數 <Num className="font-bold text-cyan-300">{cur.cardPoints}</Num>
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>
          )}
          {event1 && (
            <span className="breathe rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200">
              事件一：抽卡加倍
            </span>
          )}
        </div>
      </StickyTeam>

      <Card title="任務卡（小遊戲 / 判定）">
        <div className="mb-3 text-xs text-slate-400">
          需小隊執行小遊戲或由關主判定的好運 / 厄運卡在此進行；題庫與計時器一應俱全。
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setDrawn(drawCard("good"))}
            className="btn-amber rounded-xl py-3 text-sm font-bold transition active:scale-95"
          >
            抽好運卡
          </button>
          <button
            onClick={() => setDrawn(drawCard("bad"))}
            className="btn-rose rounded-xl py-3 text-sm font-bold transition active:scale-95"
          >
            抽厄運卡
          </button>
        </div>

        {drawn ? (
          drawn.instant ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
              這是「即時結算卡」，建議回到地圖面板就地處理；此處仍可判定：
              <div className="mt-3">
                <TaskCardView
                  drawn={drawn}
                  settler={settler}
                  team={team}
                  event1={event1}
                  onSettled={() => setDrawn(null)}
                />
              </div>
            </div>
          ) : (
            <TaskCardView
              drawn={drawn}
              settler={settler}
              team={team}
              event1={event1}
              onSettled={() => setDrawn(null)}
            />
          )
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] py-6 text-center text-sm text-slate-500">
            尚未抽卡。由地圖踩到光源點 / 迷霧區抽到任務卡時會自動帶來這裡。
          </div>
        )}

        {drawn && (
          <button
            onClick={() => setDrawn(null)}
            className="chip mt-3 w-full py-2 text-xs hover:bg-white/15"
          >
            收起
          </button>
        )}
      </Card>

      {turnMode && onComplete && <TurnCompleteBar delta={0} onComplete={onComplete} label="完成任務・返回地圖" />}
    </div>
  );
}
