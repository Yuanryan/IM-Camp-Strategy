import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { HostView } from "@/components/views/HostView";

export default async function HostPage() {
  const session = await requireRole("HOST", "ADMIN");
  return (
    <Shell role="HOST" label={session.label} title="主持人控台">
      <HostView />
    </Shell>
  );
}
