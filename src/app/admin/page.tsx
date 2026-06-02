import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { AdminView } from "@/components/views/AdminView";

export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  return (
    <Shell role="ADMIN" label={session.label} title="Admin 總覽">
      <AdminView />
    </Shell>
  );
}
