import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { TeamView } from "@/components/views/TeamView";

export default async function TeamPage() {
  const session = await requireRole("TEAM");
  return (
    <Shell role="TEAM" label={session.label} title={session.label}>
      <TeamView teamId={session.teamId!} />
    </Shell>
  );
}
