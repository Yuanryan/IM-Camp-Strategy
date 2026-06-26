export type TeamColor = {
  name: string;
  hex: string;
  text: string;
  ring: string;
};

export const TEAM_COLORS: TeamColor[] = [
  { name: "粉", hex: "#f472b6", text: "#1f1020", ring: "#f472b6" },
  { name: "黑", hex: "#020617", text: "#f8fafc", ring: "#f8fafc" },
  { name: "白", hex: "#f8fafc", text: "#0f172a", ring: "#ffffff" },
  { name: "紅", hex: "#ef4444", text: "#ffffff", ring: "#ef4444" },
  { name: "橘", hex: "#f97316", text: "#111827", ring: "#f97316" },
  { name: "黃", hex: "#facc15", text: "#111827", ring: "#facc15" },
  { name: "綠", hex: "#22c55e", text: "#052e16", ring: "#22c55e" },
  { name: "藍", hex: "#3b82f6", text: "#ffffff", ring: "#3b82f6" },
  { name: "紫", hex: "#a855f7", text: "#ffffff", ring: "#a855f7" },
  { name: "咖啡", hex: "#92400e", text: "#ffffff", ring: "#92400e" },
];

export function getTeamColorByIndex(index: number): TeamColor {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}
