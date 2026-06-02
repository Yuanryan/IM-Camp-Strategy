import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { MapView } from "@/components/views/MapView";

export default async function MapPage() {
  const session = await requireRole("MAP", "ADMIN");
  return (
    <Shell role="MAP" label={session.label} title="地圖關主">
      <MapView />
    </Shell>
  );
}
