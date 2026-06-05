import { requireRole, AUTH_OFF } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { TeamView } from "@/components/views/TeamView";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [session, params] = await Promise.all([requireRole("TEAM"), searchParams]);
  // In dev mode, ?teamId=N overrides the fallback first-team logic
  const teamId =
    AUTH_OFF && params.teamId ? parseInt(params.teamId, 10) : session.teamId!;
  return (
    <Shell role="TEAM" label={session.label} title={session.label}>
      <TeamView teamId={teamId} />
    </Shell>
  );
}
