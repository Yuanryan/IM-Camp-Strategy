import { apiRoute, num } from "@/lib/api";
import { updateAnnouncement } from "@/lib/service";

export const POST = apiRoute(["AUCTION"], async ({ body, session }) =>
  updateAnnouncement({
    eventId: num(body, "eventId"),
    announcement: typeof body.announcement === "string" ? body.announcement : "",
    byToken: session.label,
  }),
);
