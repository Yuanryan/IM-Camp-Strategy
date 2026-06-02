import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { MobileView } from "@/components/views/MobileView";

export default async function MobilePage() {
  const session = await requireRole("MOBILE", "ADMIN");
  return (
    <Shell role="MOBILE" label={session.label} title="流動關主">
      <MobileView />
    </Shell>
  );
}
