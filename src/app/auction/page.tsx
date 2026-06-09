import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { AuctionView } from "@/components/views/AuctionView";

export default async function AuctionPage() {
  const session = await requireRole("AUCTION", "ADMIN");
  return (
    <Shell role="AUCTION" label={session.label} title="拍賣官控台">
      <AuctionView />
    </Shell>
  );
}
