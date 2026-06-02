import type { ReactNode } from "react";
import { ROLE_LABEL, type Role } from "@/lib/game";

// 各角色頁面共用外框（品牌標題列 + 登出）
export function Shell({
  role,
  label,
  title,
  children,
}: {
  role: Role;
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 text-white shadow-lg shadow-violet-900/20">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg ring-1 ring-white/25 backdrop-blur">
              🏮
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold tracking-wide ring-1 ring-white/20">
                  {ROLE_LABEL[role]}
                </span>
                <span className="text-base font-bold">{title ?? label}</span>
              </div>
              {title && <span className="text-xs text-white/60">{label}</span>}
            </div>
          </div>
          <form action="/api/logout" method="post">
            <button className="rounded-lg px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white">
              登出
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass rounded-2xl p-4 shadow-lg shadow-black/20 transition hover:border-white/25 sm:p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-fuchsia-500 shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
