import { apiRoute, num } from "@/lib/api";
import { reverseLedger } from "@/lib/service";

export const POST = apiRoute(["ADMIN", "HOST", "EXCHANGE"], async ({ body, session }) =>
  reverseLedger({ ledgerId: num(body, "ledgerId"), byToken: session.label }),
);
