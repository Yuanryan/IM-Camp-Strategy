import { redirect } from "next/navigation";
import { Gem } from "lucide-react";
import { getSession, DEV_LOGIN } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/game";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; need?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);

  const { error, need } = await searchParams;
  const msg =
    error === "invalid"
      ? "連結無效，請向工作人員確認你的 QR / 連結。"
      : error === "missing"
        ? "連結缺少登入碼。"
        : need === "login"
          ? "請先用發放給你的 QR / 連結登入。"
          : null;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
      {/* 背景光暈 */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />

      <div className="glass relative w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-cyan-900/30">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-yellow-400 shadow-lg shadow-cyan-500/40">
            <Gem className="h-6 w-6 text-slate-950" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-yellow-300 bg-clip-text text-2xl font-black text-transparent">
              IM 大富翁
            </h1>
            <p className="text-sm font-medium text-slate-400">迷霧資本戰・即時系統</p>
          </div>
        </div>

        {msg && (
          <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
            {msg}
          </p>
        )}

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p>
            本系統採「角色 QR / 連結」登入，不需帳號密碼。請掃描工作人員發給你的
            QR code，或開啟對應連結即可進入你的頁面。
          </p>
          <p className="text-xs text-slate-500">
            登入後 12 小時內免再登入；若被登出，重新掃描即可。
          </p>
        </div>

        {DEV_LOGIN ? (
          <>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-amber-300/80">
              點選即以該角色登入
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-medium">
              {Object.entries(ROLE_LABEL).map(([role, label]) => (
                <li key={role}>
                  <a
                    href={`/api/login?role=${role}`}
                    className="block rounded-xl border border-amber-400/30 bg-amber-400/10 py-2 text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-400/20 hover:text-amber-100 active:scale-95"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium text-slate-400">
            {Object.entries(ROLE_LABEL).map(([role, label]) => (
              <li
                key={role}
                className="rounded-xl border border-white/10 bg-white/5 py-2"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="relative mt-6 text-xs text-slate-500">© 2026 資管營 · IM 大富翁：迷霧資本戰</p>
    </main>
  );
}
