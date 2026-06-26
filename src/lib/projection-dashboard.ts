export type ProjectionRankTier = "gold" | "silver" | "bronze" | "standard";
export type ProjectionLevelTier = "none" | "lit" | "boosted" | "max";

const PODIUM_TIERS: ProjectionRankTier[] = ["gold", "silver", "bronze"];

export function getProjectionRankTier(index: number): ProjectionRankTier {
  return PODIUM_TIERS[index] ?? "standard";
}

export function getProjectionLevelTier(level: number): ProjectionLevelTier {
  if (level >= 3) return "max";
  if (level === 2) return "boosted";
  if (level === 1) return "lit";
  return "none";
}
