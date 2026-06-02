import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { ExchangeView } from "@/components/views/ExchangeView";

export default async function ExchangePage() {
  const session = await requireRole("EXCHANGE", "ADMIN");
  return (
    <Shell role="EXCHANGE" label={session.label} title="交易所">
      <ExchangeView />
    </Shell>
  );
}
