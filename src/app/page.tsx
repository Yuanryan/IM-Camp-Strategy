import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
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
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-violet-900/10 ring-1 ring-black/5 backdrop-blur-xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-2xl shadow-lg shadow-violet-500/30">
            🏮
          </span>
          <div>
            <h1 className="bg-gradient-to-r from-indigo-700 to-fuchsia-700 bg-clip-text text-2xl font-black text-transparent">
              IM 大富翁
            </h1>
            <p className="text-sm font-medium text-zinc-500">迷霧資本戰・即時系統</p>
          </div>
        </div>

        {msg && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {msg}
          </p>
        )}

        <div className="space-y-2 rounded-2xl bg-zinc-50/80 p-4 text-sm text-zinc-600 ring-1 ring-black/5">
          <p>
            本系統採「角色 QR / 連結」登入，不需帳號密碼。請掃描工作人員發給你的
            QR code，或開啟對應連結即可進入你的頁面。
          </p>
          <p className="text-xs text-zinc-400">
            登入後 12 小時內免再登入；若被登出，重新掃描即可。
          </p>
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium text-zinc-500">
          {Object.entries(ROLE_LABEL).map(([role, label]) => (
            <li
              key={role}
              className="rounded-xl border border-zinc-200/70 bg-white/70 py-2 shadow-sm"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-6 text-xs text-zinc-400">© 2026 資管營 · IM 大富翁：迷霧資本戰</p>
    </main>
  );
}
