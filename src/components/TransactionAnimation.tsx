"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Ban, CircleSlash2 } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

export type TxStatus = "success" | "failed" | "rejected" | "canceled";
export type TxResult = { status: TxStatus; detail: ReactNode } | null;

const ANIM_MS = 2500; // 全螢幕動畫停留
const POPUP_EXTRA_MS = 1000; // pop up 比動畫多停留

type Theme = {
  Icon: ComponentType<{ className?: string }>;
  big: string;
  label: string;
  accent: string; // 文字 / icon 顏色 + 光暈
  ring: string; // 擴散光波邊框
  halo: string; // 圓圈底色 + 外光
  popBorder: string; // pop up 邊框
  popLabel: string; // pop up 小標顏色
};

const ROSE = {
  accent: "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]",
  ring: "border-rose-400",
  halo: "bg-rose-500/10 shadow-[0_0_50px_rgba(244,63,94,0.3)]",
  popBorder: "border border-rose-400/30",
  popLabel: "text-rose-300",
};
const AMBER = {
  accent: "text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]",
  ring: "border-amber-400",
  halo: "bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.3)]",
  popBorder: "border border-amber-400/30",
  popLabel: "text-amber-300",
};

const THEMES: Record<TxStatus, Theme> = {
  success: {
    Icon: CheckCircle2,
    big: "SUCCESSFUL",
    label: "交易成功",
    accent: "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]",
    ring: "border-cyan-400",
    halo: "bg-cyan-500/10 shadow-[0_0_50px_rgba(34,211,238,0.3)]",
    popBorder: "border border-cyan-400/30",
    popLabel: "text-cyan-300",
  },
  failed: { Icon: XCircle, big: "FAILED", label: "交易失敗", ...ROSE },
  rejected: { Icon: Ban, big: "REJECTED", label: "交易被拒絕", ...ROSE },
  canceled: { Icon: CircleSlash2, big: "CANCELED", label: "交易已取消", ...AMBER },
};

export function TransactionAnimation({
  result,
  onClose,
}: {
  result: TxResult;
  onClose: () => void;
}) {
  const [animOpen, setAnimOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!result) return;
    setAnimOpen(true);
    setPopupOpen(true);
    const t1 = setTimeout(() => setAnimOpen(false), ANIM_MS);
    const t2 = setTimeout(() => {
      setPopupOpen(false);
      onCloseRef.current();
    }, ANIM_MS + POPUP_EXTRA_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [result]);

  const theme = THEMES[result?.status ?? "success"];
  const Icon = theme.Icon;

  return (
    <>
      {/* 全螢幕動畫 — 點螢幕即關閉 */}
      <AnimatePresence>
        {animOpen && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAnimOpen(false)}
            className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-slate-950/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className={`relative flex items-center justify-center rounded-full p-6 ${theme.halo}`}
              >
                <motion.div
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1.6], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.2, 1], repeat: Infinity }}
                  className={`absolute inset-0 rounded-full border-2 ${theme.ring}`}
                />
                <Icon className={`h-24 w-24 ${theme.accent}`} />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-8 flex flex-col items-center"
              >
                <h2 className="text-3xl font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  TRANSACTION
                </h2>
                <h2 className={`text-3xl font-black tracking-widest ${theme.accent}`}>{theme.big}</h2>
                <div className="mt-4 text-base font-bold text-slate-100">{result.detail}</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 細節 pop up — 比動畫多停留 1 秒，且不可點掉（pointer-events-none）*/}
      <AnimatePresence>
        {popupOpen && result && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4"
          >
            <div className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${theme.popBorder}`}>
              <Icon className={`h-6 w-6 shrink-0 ${theme.accent}`} />
              <div>
                <div className={`text-xs font-bold ${theme.popLabel}`}>{theme.label}</div>
                <div className="text-sm text-slate-100">{result.detail}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
