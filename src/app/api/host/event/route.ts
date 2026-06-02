import { apiRoute, num } from "@/lib/api";
import { setEvent } from "@/lib/service";

export const POST = apiRoute(["HOST"], async ({ body }) =>
  setEvent({
    index: num(body, "index"),
    on: Boolean(body.on),
    penaltyRegion: typeof body.penaltyRegion === "string" ? (body.penaltyRegion as string) : null,
  }),
);
