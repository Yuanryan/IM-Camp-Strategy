import { apiRoute, str } from "@/lib/api";
import { setPhase } from "@/lib/service";

export const POST = apiRoute(["HOST"], async ({ body }) => setPhase({ phase: str(body, "phase") }));
