import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { LotteryView } from "@/components/views/LotteryView";

export default async function LotteryPage() {
  const session = await requireRole("LOTTERY", "ADMIN");
  return (
    <Shell role="LOTTERY" label={session.label} title="大樂透">
      <LotteryView />
    </Shell>
  );
}
