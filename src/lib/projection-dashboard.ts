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

// 名稱的「視覺寬度」：全形（中日韓等）字算 1 單位，半形（英數、標點、空白）算 0.5 單位。
// 這樣「404 not found」等英數名稱不會被當成一堆全形字而被過度縮小。
export function getProjectionNameVisualWidth(name: string): number {
  let width = 0;
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK 統一漢字、日文假名、諺文、全形符號等以 U+1100 以上的常見全形區間概估為全形。
    const isFullWidth =
      (code >= 0x1100 && code <= 0x115f) || // 諺文字母
      (code >= 0x2e80 && code <= 0x9fff) || // CJK 部首～統一漢字
      (code >= 0xac00 && code <= 0xd7a3) || // 諺文音節
      (code >= 0xf900 && code <= 0xfaff) || // CJK 相容漢字
      (code >= 0xff00 && code <= 0xff60) || // 全形 ASCII 變體
      (code >= 0xffe0 && code <= 0xffe6); // 全形符號
    width += isFullWidth ? 1 : 0.5;
  }
  return width;
}

// 排行榜隊名字級：依名稱「視覺寬度」動態縮放，讓長名字不被截斷。
// 視覺寬度在 FULL_WIDTH（含）以內用最大字級；超過後每多一單位線性縮小，縮到 MIN_SCALE 為止。
// 回傳倍率，供 CSS 以 calc 套用在基礎字級上。
export function getProjectionRankNameScale(name: string): number {
  const FULL_WIDTH = 6; // 視覺寬度 6 以內：滿版
  const MIN_SCALE = 0.62; // 最小縮到 60%
  const SHRINK_PER_UNIT = 0.05; // 每超過一單位寬縮 8%
  const width = getProjectionNameVisualWidth(name);
  if (width <= FULL_WIDTH) return 1;
  const scale = 1 - (width - FULL_WIDTH) * SHRINK_PER_UNIT;
  return Math.max(MIN_SCALE, scale);
}
