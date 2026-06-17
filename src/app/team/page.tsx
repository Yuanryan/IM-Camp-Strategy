import { requireRole, authOff } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { TeamView } from "@/components/views/TeamView";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [session, params, off] = await Promise.all([
    requireRole("TEAM"),
    searchParams,
    authOff(),
  ]);
  // 停用驗證時（env 或執行期旗標），?teamId=N 可覆寫 fallback 的第一隊邏輯
  const teamId = off && params.teamId ? parseInt(params.teamId, 10) : session.teamId!;
  return (
    <Shell role="TEAM" label={session.label} title={session.label}>
      <TeamView teamId={teamId} />
    </Shell>
  );
}
