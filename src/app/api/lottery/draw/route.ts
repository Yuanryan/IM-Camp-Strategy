import { apiRoute } from "@/lib/api";
import { drawLottery } from "@/lib/service";

export const POST = apiRoute(["LOTTERY", "MAP"], async ({ session }) =>
  drawLottery({ byToken: session.label }),
);
