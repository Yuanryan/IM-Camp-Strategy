import { requireRole } from "@/lib/auth";
import { ProjectionView } from "@/components/views/ProjectionView";

export default async function ProjectionPage() {
  await requireRole("PROJECTION");
  return <ProjectionView />;
}
