import type { ReactNode } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/game";
import { FogToggle } from "@/components/ui/fog-toggle";

// 各角色頁面共用外框（透明毛玻璃標題列 + 登出）
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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.25)]">
              <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  {ROLE_LABEL[role]}
                </span>
                <span className="text-base font-bold tracking-wide text-slate-100">
                  {title ?? label}
                </span>
              </div>
              {title && <span className="text-xs text-slate-500">{label}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FogToggle />
            <form action="/api/logout" method="post">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2.5 py-1.5 text-xs text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400">
                <LogOut className="h-3.5 w-3.5" />
                登出
              </button>
            </form>
          </div>
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
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass rounded-2xl p-4 shadow-lg shadow-black/20 transition-all hover:bg-white/10 sm:p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-200">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.75)]" />
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
