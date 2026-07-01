import { apiRoute } from "@/lib/api";
import { adminSetAdvancedSettings } from "@/lib/service";

const numOrUndef = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);

export const POST = apiRoute(["ADMIN"], async ({ body }) =>
  adminSetAdvancedSettings({
    auroraMultiplier: numOrUndef(body.auroraMultiplier),
    spectraCardPoints: numOrUndef(body.spectraCardPoints),
    havenApprIntervalMs: numOrUndef(body.havenApprIntervalMs),
    havenApprRate: numOrUndef(body.havenApprRate),
    houseIncomeL1: numOrUndef(body.houseIncomeL1),
    houseIncomeL2: numOrUndef(body.houseIncomeL2),
    houseIncomeL3: numOrUndef(body.houseIncomeL3),
    cardRegionUpMult: numOrUndef(body.cardRegionUpMult),
    cardRegionDownMult: numOrUndef(body.cardRegionDownMult),
    cardBuildingUpMult: numOrUndef(body.cardBuildingUpMult),
    cardBuildingDownMult: numOrUndef(body.cardBuildingDownMult),
  }),
);
