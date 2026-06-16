import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { ShopView } from "@/components/views/ShopView";

export default async function ShopPage() {
  const session = await requireRole("CARDSHOP", "ADMIN");
  return (
    <Shell role="CARDSHOP" label={session.label} title="神秘商店">
      <ShopView />
    </Shell>
  );
}
